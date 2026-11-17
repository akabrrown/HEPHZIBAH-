import { revalidatePath } from "next/cache";
import type { AdminSessionPayload } from "@/lib/auth";
import { withAdminRole, withAnonRole } from "@/lib/db";
import { ProblemError } from "@/lib/errors";
import type { ServiceKind } from "@/modules/catalog/schema";
import {
  findAllFaqsAdmin,
  findAllPortfolioAdmin,
  findAllTestimonialsAdmin,
  findPortfolioAdminById,
  findPortfolioItemBySlug,
  findPublishedFaqs,
  findPublishedPortfolioItems,
  findPublishedTestimonials,
} from "./repository";
import {
  faqUpsertSchema,
  mediaAssetCreateSchema,
  portfolioItemUpsertSchema,
  testimonialUpsertSchema,
  type FaqItem,
  type MediaAsset,
  type PortfolioItem,
  type Testimonial,
} from "./schema";

export async function getPublicPortfolioList(filters?: {
  kind?: ServiceKind;
  occasionSlug?: string;
  featuredOnly?: boolean;
}): Promise<PortfolioItem[]> {
  return withAnonRole((tx) => findPublishedPortfolioItems(tx, filters));
}

export async function getPublicPortfolioDetail(slug: string): Promise<PortfolioItem | null> {
  return withAnonRole((tx) => findPortfolioItemBySlug(tx, slug));
}

export async function getPublicTestimonials(): Promise<Testimonial[]> {
  return withAnonRole((tx) => findPublishedTestimonials(tx));
}

export async function getPublicFaqs(): Promise<FaqItem[]> {
  return withAnonRole((tx) => findPublishedFaqs(tx));
}

export async function listAdminPortfolio(admin: AdminSessionPayload): Promise<PortfolioItem[]> {
  return withAdminRole(admin.adminId, admin.aal, (tx) => findAllPortfolioAdmin(tx));
}

export async function getAdminPortfolioDetail(
  admin: AdminSessionPayload,
  id: string
): Promise<PortfolioItem> {
  const item = await withAdminRole(admin.adminId, admin.aal, (tx) =>
    findPortfolioAdminById(tx, id)
  );
  if (!item) {
    throw new ProblemError(404, "not_found", "Portfolio item not found", "No item matches that ID.");
  }
  return item;
}

function revalidatePortfolioPaths(slug?: string): void {
  try {
    revalidatePath("/");
    revalidatePath("/portfolio");
    revalidatePath("/services");
    revalidatePath("/about");
    revalidatePath("/testimonials");
    revalidatePath("/faq");
    if (slug) {
      revalidatePath(`/portfolio/${slug}`);
    }
  } catch {
    // ignore outside request lifecycle
  }
}

export async function upsertAdminPortfolioItem(
  admin: AdminSessionPayload,
  rawInput: unknown
): Promise<PortfolioItem> {
  const parsed = portfolioItemUpsertSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstMsg = parsed.error.issues[0]?.message ?? "Portfolio item validation failed.";
    throw new ProblemError(422, "validation_error", "Check portfolio fields", firstMsg, {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }
  const v = parsed.data;
  const saved = await withAdminRole(admin.adminId, admin.aal, async (tx) => {
    if (v.id) {
      const existing = await findPortfolioAdminById(tx, v.id);
      if (!existing) {
        throw new ProblemError(404, "not_found", "Portfolio item not found", "No item matches that ID.");
      }
      if (v.status === "published") {
        const assets = existing.media_assets ?? [];
        if (assets.length === 0) {
          throw new ProblemError(
            422,
            "media_required",
            "Add at least one image or video before publishing",
            "Upload at least one image with alt text or add a video embed before publishing."
          );
        }
        const missingAlt = assets.some((a) => !a.alt_text || a.alt_text.trim().length === 0);
        if (missingAlt) {
          throw new ProblemError(
            422,
            "alt_text_required",
            "Alt text missing",
            "Every image or video poster needs descriptive alt text before publishing."
          );
        }
      }

      const publishedAt =
        v.status === "published" ? existing.published_at ?? new Date().toISOString() : null;
      const effectiveStatus = v.client_consent_to_publish ? v.status : "draft";
      const res = await tx.query<PortfolioItem>(
        `update portfolio_items
            set kind = $2::service_kind,
                slug = $3,
                title = $4,
                summary = $5,
                occasion_id = $6::uuid,
                shot_on = $7::date,
                location_text = $8,
                status = $9::publish_status,
                is_featured = $10,
                sort_order = $11,
                client_consent_to_publish = $12,
                consent_note = $13,
                published_at = $14::timestamptz
          where id = $1::uuid
          returning id, kind, slug, title, summary, occasion_id, shot_on::text as shot_on,
                    location_text, status, is_featured, sort_order, client_consent_to_publish,
                    consent_note, published_at::text as published_at, created_at::text, updated_at::text`,
        [
          v.id,
          v.kind,
          v.slug,
          v.title,
          v.summary ?? null,
          v.occasion_id ?? null,
          v.shot_on ?? null,
          v.location_text ?? null,
          effectiveStatus,
          v.is_featured,
          v.sort_order,
          v.client_consent_to_publish,
          v.consent_note ?? null,
          effectiveStatus === "published" ? publishedAt : null,
        ]
      );
      return res.rows[0]!;
    }

    if (v.status === "published") {
      throw new ProblemError(
        422,
        "media_required",
        "Add media before publishing",
        "Create the portfolio item as a draft, add images or video, then publish."
      );
    }

    const res = await tx.query<PortfolioItem>(
      `insert into portfolio_items (
         kind, slug, title, summary, occasion_id, shot_on, location_text,
         status, is_featured, sort_order, client_consent_to_publish, consent_note, published_at
       ) values ($1::service_kind, $2, $3, $4, $5::uuid, $6::date, $7, 'draft', $8, $9, $10, $11, null)
       returning id, kind, slug, title, summary, occasion_id, shot_on::text as shot_on,
                 location_text, status, is_featured, sort_order, client_consent_to_publish,
                 consent_note, published_at::text as published_at, created_at::text, updated_at::text`,
      [
        v.kind,
        v.slug,
        v.title,
        v.summary ?? null,
        v.occasion_id ?? null,
        v.shot_on ?? null,
        v.location_text ?? null,
        v.is_featured,
        v.sort_order,
        v.client_consent_to_publish,
        v.consent_note ?? null,
      ]
    );
    return res.rows[0]!;
  });

  revalidatePortfolioPaths(saved.slug);
  return saved;
}

export async function addAdminMediaAsset(
  admin: AdminSessionPayload,
  portfolioItemId: string,
  rawInput: unknown
): Promise<MediaAsset> {
  const parsed = mediaAssetCreateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ProblemError(422, "validation_error", "Check media fields", "Invalid media asset input.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }
  const v = parsed.data;
  const asset = await withAdminRole(admin.adminId, admin.aal, async (tx) => {
    if (v.is_cover) {
      await tx.query(
        `update media_assets set is_cover = false where portfolio_item_id = $1::uuid and is_cover = true`,
        [portfolioItemId]
      );
    }
    const res = await tx.query<MediaAsset>(
      `insert into media_assets (
         portfolio_item_id, type, position, is_cover, cloudinary_public_id, poster_public_id,
         width, height, alt_text, video_provider, video_id, duration_seconds, caption
       ) values (
         $1::uuid, $2::media_type, $3, $4, $5, $6,
         $7, $8, $9, $10::video_provider, $11, $12, $13
       )
       returning id, portfolio_item_id, type, position, is_cover, cloudinary_public_id, poster_public_id,
                 width, height, alt_text, video_provider, video_id, duration_seconds, caption, created_at::text`,
      [
        portfolioItemId,
        v.type,
        v.position,
        v.is_cover,
        v.cloudinary_public_id ?? null,
        v.poster_public_id ?? null,
        v.width ?? null,
        v.height ?? null,
        v.alt_text ?? null,
        v.video_provider ?? null,
        v.video_id ?? null,
        v.duration_seconds ?? null,
        v.caption ?? null,
      ]
    );
    return res.rows[0]!;
  });

  revalidatePortfolioPaths();
  return asset;
}

export async function updateAdminMediaAsset(
  admin: AdminSessionPayload,
  portfolioItemId: string,
  mediaId: string,
  updates: { is_cover?: boolean; position?: number; alt_text?: string; caption?: string | null }
): Promise<void> {
  await withAdminRole(admin.adminId, admin.aal, async (tx) => {
    if (updates.is_cover) {
      await tx.query(
        `update media_assets set is_cover = false where portfolio_item_id = $1::uuid and is_cover = true`,
        [portfolioItemId]
      );
    }
    const sets: string[] = [];
    const params: unknown[] = [mediaId, portfolioItemId];
    if (typeof updates.is_cover === "boolean") {
      params.push(updates.is_cover);
      sets.push(`is_cover = $${params.length}`);
    }
    if (typeof updates.position === "number") {
      params.push(updates.position);
      sets.push(`position = $${params.length}`);
    }
    if (typeof updates.alt_text === "string") {
      if (updates.alt_text.trim().length === 0) {
        throw new ProblemError(422, "alt_text_required", "Alt text cannot be empty", "Provide descriptive alt text.");
      }
      params.push(updates.alt_text.trim());
      sets.push(`alt_text = $${params.length}`);
    }
    if (updates.caption !== undefined) {
      params.push(updates.caption);
      sets.push(`caption = $${params.length}`);
    }
    if (sets.length > 0) {
      await tx.query(
        `update media_assets set ${sets.join(", ")} where id = $1::uuid and portfolio_item_id = $2::uuid`,
        params
      );
    }
  });
  revalidatePortfolioPaths();
}

export async function deleteAdminMediaAsset(
  admin: AdminSessionPayload,
  portfolioItemId: string,
  mediaId: string
): Promise<void> {
  await withAdminRole(admin.adminId, admin.aal, async (tx) => {
    await tx.query(
      `delete from media_assets where id = $1::uuid and portfolio_item_id = $2::uuid`,
      [mediaId, portfolioItemId]
    );
  });
  revalidatePortfolioPaths();
}

export async function listAdminContent(admin: AdminSessionPayload): Promise<{
  testimonials: Testimonial[];
  faqs: FaqItem[];
}> {
  return withAdminRole(admin.adminId, admin.aal, async (tx) => {
    const [testimonials, faqs] = await Promise.all([
      findAllTestimonialsAdmin(tx),
      findAllFaqsAdmin(tx),
    ]);
    return { testimonials, faqs };
  });
}

export async function upsertAdminTestimonial(
  admin: AdminSessionPayload,
  rawInput: unknown
): Promise<Testimonial> {
  const parsed = testimonialUpsertSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ProblemError(422, "validation_error", "Check testimonial fields", "Invalid testimonial.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }
  const v = parsed.data;
  const saved = await withAdminRole(admin.adminId, admin.aal, async (tx) => {
    const effectiveStatus = v.consent_to_publish ? v.status : "draft";
    if (v.id) {
      const res = await tx.query<Testimonial>(
        `update testimonials
            set author_name = $2, author_context = $3, quote = $4, booking_id = $5::uuid,
                consent_to_publish = $6, status = $7::publish_status, sort_order = $8
          where id = $1::uuid
          returning id, author_name, author_context, quote, booking_id, consent_to_publish, status, sort_order, created_at::text, updated_at::text`,
        [
          v.id,
          v.author_name,
          v.author_context ?? null,
          v.quote,
          v.booking_id ?? null,
          v.consent_to_publish,
          effectiveStatus,
          v.sort_order,
        ]
      );
      if (!res.rows[0]) {
        throw new ProblemError(404, "not_found", "Testimonial not found", "No testimonial matches that ID.");
      }
      return res.rows[0];
    }

    const res = await tx.query<Testimonial>(
      `insert into testimonials (author_name, author_context, quote, booking_id, consent_to_publish, status, sort_order)
       values ($1, $2, $3, $4::uuid, $5, $6::publish_status, $7)
       returning id, author_name, author_context, quote, booking_id, consent_to_publish, status, sort_order, created_at::text, updated_at::text`,
      [
        v.author_name,
        v.author_context ?? null,
        v.quote,
        v.booking_id ?? null,
        v.consent_to_publish,
        effectiveStatus,
        v.sort_order,
      ]
    );
    return res.rows[0]!;
  });
  revalidatePortfolioPaths();
  return saved;
}

export async function upsertAdminFaq(
  admin: AdminSessionPayload,
  rawInput: unknown
): Promise<FaqItem> {
  const parsed = faqUpsertSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ProblemError(422, "validation_error", "Check FAQ fields", "Invalid FAQ entry.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }
  const v = parsed.data;
  const saved = await withAdminRole(admin.adminId, admin.aal, async (tx) => {
    if (v.id) {
      const res = await tx.query<FaqItem>(
        `update faqs
            set question = $2, answer = $3, sort_order = $4, is_published = $5
          where id = $1::uuid
          returning id, question, answer, sort_order, is_published`,
        [v.id, v.question, v.answer, v.sort_order, v.is_published]
      );
      if (!res.rows[0]) {
        throw new ProblemError(404, "not_found", "FAQ not found", "No FAQ matches that ID.");
      }
      return res.rows[0];
    }
    const res = await tx.query<FaqItem>(
      `insert into faqs (question, answer, sort_order, is_published)
       values ($1, $2, $3, $4)
       returning id, question, answer, sort_order, is_published`,
      [v.question, v.answer, v.sort_order, v.is_published]
    );
    return res.rows[0]!;
  });
  revalidatePortfolioPaths();
  return saved;
}
