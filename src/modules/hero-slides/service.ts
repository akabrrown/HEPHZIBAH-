import { cache } from "react";
import { revalidatePath } from "next/cache";
import type { AdminSessionPayload } from "@/lib/auth";
import { getCached, invalidateCache, setCached } from "@/lib/cache";
import { withAdminRole, withAnonRole } from "@/lib/db";
import { ProblemError, rethrowKnownPgError } from "@/lib/errors";
import { assertUuid } from "@/lib/http";
import { findActiveHeroSlides, findAllHeroSlidesAdmin } from "./repository";
import {
  heroSlideCreateSchema,
  heroSlideReorderSchema,
  heroSlideUpdateSchema,
  type HeroSlide,
} from "./schema";

const MAX_HERO_SLIDES = 20;

const HERO_SLIDE_RETURN_COLS = `
  id,
  image_public_id,
  alt_text,
  focal_x,
  focal_y,
  eyebrow_left,
  eyebrow_right,
  headline,
  subcopy,
  sort_order,
  is_active,
  created_at::text as created_at,
  updated_at::text as updated_at
`;

function invalidateHeroCache(): void {
  invalidateCache("hero_slides");
  try {
    revalidatePath("/");
  } catch {
    // Ignore outside Next.js request lifecycle (tests/CLI scripts)
  }
}

export const getPublicHeroSlides = cache(async (): Promise<HeroSlide[]> => {
  const cacheKey = "hero_slides:public";
  const cached = getCached<HeroSlide[]>(cacheKey);
  if (cached) return cached;

  const slides = await withAnonRole((tx) => findActiveHeroSlides(tx));
  setCached(cacheKey, slides, 300);
  return slides;
});

export async function listAdminHeroSlides(admin: AdminSessionPayload): Promise<HeroSlide[]> {
  return withAdminRole(admin.adminId, admin.aal, (tx) => findAllHeroSlidesAdmin(tx));
}

export async function createAdminHeroSlide(
  admin: AdminSessionPayload,
  rawInput: unknown
): Promise<HeroSlide> {
  const parsed = heroSlideCreateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ProblemError(422, "validation_error", "Check hero slide fields", "Invalid hero slide details.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }
  const v = parsed.data;

  const created = await withAdminRole(admin.adminId, admin.aal, async (tx) => {
    try {
      const countRes = await tx.query<{ cnt: number; next_order: number }>(
        `select count(*)::int as cnt, coalesce(max(sort_order) + 1, 0)::int as next_order from hero_slides`
      );
      const count = countRes.rows[0]?.cnt ?? 0;
      if (count >= MAX_HERO_SLIDES) {
        throw new ProblemError(
          409,
          "slide_limit_reached",
          "Hero slideshow limit reached",
          `A maximum of ${MAX_HERO_SLIDES} hero slides can be stored at once. Remove an unused slide before uploading another.`
        );
      }
      const sortOrder = v.sort_order ?? countRes.rows[0]?.next_order ?? 0;

      const res = await tx.query<HeroSlide>(
        `insert into hero_slides (
           image_public_id, alt_text, focal_x, focal_y,
           eyebrow_left, eyebrow_right, headline, subcopy,
           sort_order, is_active
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         returning ${HERO_SLIDE_RETURN_COLS}`,
        [
          v.image_public_id,
          v.alt_text,
          v.focal_x,
          v.focal_y,
          v.eyebrow_left ?? null,
          v.eyebrow_right ?? null,
          v.headline ?? null,
          v.subcopy ?? null,
          sortOrder,
          v.is_active,
        ]
      );
      return res.rows[0]!;
    } catch (err) {
      rethrowKnownPgError(err);
    }
  });

  invalidateHeroCache();
  return created;
}

export async function updateAdminHeroSlide(
  admin: AdminSessionPayload,
  rawInput: unknown
): Promise<HeroSlide> {
  const parsed = heroSlideUpdateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ProblemError(422, "validation_error", "Check hero slide fields", "Invalid hero slide update.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }
  const v = parsed.data;

  const sets: string[] = [];
  const params: unknown[] = [v.id];
  const addSet = (col: string, val: unknown) => {
    params.push(val);
    sets.push(`${col} = $${params.length}`);
  };

  if (v.image_public_id !== undefined) addSet("image_public_id", v.image_public_id);
  if (v.alt_text !== undefined) addSet("alt_text", v.alt_text);
  if (v.focal_x !== undefined) addSet("focal_x", v.focal_x);
  if (v.focal_y !== undefined) addSet("focal_y", v.focal_y);
  if (v.eyebrow_left !== undefined) addSet("eyebrow_left", v.eyebrow_left);
  if (v.eyebrow_right !== undefined) addSet("eyebrow_right", v.eyebrow_right);
  if (v.headline !== undefined) addSet("headline", v.headline);
  if (v.subcopy !== undefined) addSet("subcopy", v.subcopy);
  if (v.sort_order !== undefined) addSet("sort_order", v.sort_order);
  if (v.is_active !== undefined) addSet("is_active", v.is_active);

  if (sets.length === 0) {
    throw new ProblemError(422, "validation_error", "No changes supplied", "Provide at least one field to update.");
  }

  const updated = await withAdminRole(admin.adminId, admin.aal, async (tx) => {
    try {
      const res = await tx.query<HeroSlide>(
        `update hero_slides
            set ${sets.join(", ")}
          where id = $1::uuid
          returning ${HERO_SLIDE_RETURN_COLS}`,
        params
      );
      if (!res.rows[0]) {
        throw new ProblemError(404, "not_found", "Hero slide not found", "No hero slide matches that ID.");
      }
      return res.rows[0];
    } catch (err) {
      rethrowKnownPgError(err);
    }
  });

  invalidateHeroCache();
  return updated;
}

export async function reorderAdminHeroSlides(
  admin: AdminSessionPayload,
  rawInput: unknown
): Promise<HeroSlide[]> {
  const parsed = heroSlideReorderSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ProblemError(422, "validation_error", "Invalid slide order", "Provide a valid list of slide IDs.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  const orderedIds = parsed.data.orderedIds;
  if (new Set(orderedIds).size !== orderedIds.length) {
    throw new ProblemError(422, "validation_error", "Duplicate slide IDs", "Ordered slide IDs must be unique.");
  }

  const slides = await withAdminRole(admin.adminId, admin.aal, async (tx) => {
    await tx.query(
      `update hero_slides hs
          set sort_order = t.pos
         from unnest($1::uuid[], $2::int[]) as t(slide_id, pos)
        where hs.id = t.slide_id`,
      [orderedIds, orderedIds.map((_, idx) => idx)]
    );
    return findAllHeroSlidesAdmin(tx);
  });

  invalidateHeroCache();
  return slides;
}

export async function deleteAdminHeroSlide(
  admin: AdminSessionPayload,
  rawId: string
): Promise<void> {
  const id = assertUuid(rawId, "hero slide ID");

  await withAdminRole(admin.adminId, admin.aal, async (tx) => {
    const res = await tx.query(
      `delete from hero_slides where id = $1::uuid returning id`,
      [id]
    );
    if (!res.rows[0]) {
      throw new ProblemError(404, "not_found", "Hero slide not found", "No hero slide matches that ID.");
    }
  });

  invalidateHeroCache();
}
