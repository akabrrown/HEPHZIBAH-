import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import type { AdminSessionPayload } from "@/lib/auth";
import { invalidateCache } from "@/lib/cache";
import { createFreshTestDb, setTestDbInstance } from "@/lib/db";
import { DEFAULT_BOOKINGS_ADMIN_ID, DEFAULT_CONTENT_ADMIN_ID } from "@/lib/seed-data";
import {
  heroSlideCreateSchema,
  heroSlideReorderSchema,
  heroSlideUpdateSchema,
  isSafeSlideImageRef,
} from "@/modules/hero-slides/schema";
import {
  createAdminHeroSlide,
  deleteAdminHeroSlide,
  getPublicHeroSlides,
  listAdminHeroSlides,
  reorderAdminHeroSlides,
  updateAdminHeroSlide,
} from "@/modules/hero-slides/service";

describe("Hero slide schemas & image reference safety", () => {
  it("accepts Cloudinary IDs, Cloudinary HTTPS URLs, and safe /media paths while blocking unsafe inputs", () => {
    expect(isSafeSlideImageRef("/media/hephzibah-hero-bg.jpg")).toBe(true);
    expect(isSafeSlideImageRef("hephzibah/hero/wedding-frame")).toBe(true);
    expect(isSafeSlideImageRef("https://res.cloudinary.com/demo/image/upload/v1/hero.jpg")).toBe(true);

    expect(isSafeSlideImageRef("javascript:alert(1)")).toBe(false);
    expect(isSafeSlideImageRef("//attacker.example/hero.jpg")).toBe(false);
    expect(isSafeSlideImageRef("/media/../secrets.txt")).toBe(false);
    expect(isSafeSlideImageRef("https://evil.example/hero.jpg")).toBe(false);
    expect(isSafeSlideImageRef("")).toBe(false);
  });

  it("validates create, update, and reorder payloads accurately", () => {
    expect(
      heroSlideCreateSchema.safeParse({
        image_public_id: "hephzibah/hero/wedding-1",
        alt_text: "Bride and groom exiting Holy Spirit Cathedral in Accra",
        focal_x: 50,
        focal_y: 25,
      }).success
    ).toBe(true);

    expect(
      heroSlideCreateSchema.safeParse({
        image_public_id: "hephzibah/hero/wedding-1",
        alt_text: "Hi", // too short
        focal_x: 120, // > 100
      }).success
    ).toBe(false);

    expect(
      heroSlideUpdateSchema.safeParse({
        id: "11111111-1111-4111-8111-111111111111",
        headline: "   ",
      }).success
    ).toBe(true);

    expect(
      heroSlideReorderSchema.safeParse({
        orderedIds: [],
      }).success
    ).toBe(false);
  });
});

describe("Hero slides RLS, CRUD, and atomic ordering", () => {
  let db: PGlite;

  const contentAdmin: AdminSessionPayload = {
    adminId: DEFAULT_CONTENT_ADMIN_ID,
    email: "content@hephzibahmedia.com",
    displayName: "Ama Boateng (Content)",
    scopes: ["content"],
    aal: "aal2",
    exp: Math.floor(Date.now() / 1000) + 3600,
    jti: "test-jti-hero-content",
  };

  beforeAll(async () => {
    db = await createFreshTestDb();
    setTestDbInstance(db);
  });

  beforeEach(() => {
    invalidateCache("hero_slides");
  });

  afterAll(async () => {
    setTestDbInstance(null as unknown as PGlite);
    await db.close();
  });

  it("creates, updates, reorders, hides/publishes via RLS, and deletes hero slides", async () => {
    // Initially empty
    expect(await getPublicHeroSlides()).toEqual([]);

    const s1 = await createAdminHeroSlide(contentAdmin, {
      image_public_id: "/media/hephzibah-hero-bg.jpg",
      alt_text: "Hephzibah studio crew portrait in Accra",
      focal_x: 75,
      focal_y: 22,
      headline: "Stories worth keeping.",
      is_active: true,
    });
    const s2 = await createAdminHeroSlide(contentAdmin, {
      image_public_id: "hephzibah/hero/summit-wide",
      alt_text: "Keynote photography at Accra International Conference Centre",
      focal_x: 50,
      focal_y: 35,
      is_active: true,
    });
    const s3 = await createAdminHeroSlide(contentAdmin, {
      image_public_id: "hephzibah/hero/hidden-draft",
      alt_text: "Hidden backstage portrait frame",
      is_active: false,
    });

    const adminAll = await listAdminHeroSlides(contentAdmin);
    expect(adminAll).toHaveLength(3);

    // Public reader sees only active slides in sort order
    const publicInitial = await getPublicHeroSlides();
    expect(publicInitial.map((s) => s.id)).toEqual([s1.id, s2.id]);
    expect(publicInitial[0]?.headline).toBe("Stories worth keeping.");

    // Bookings-only admin and aal1 content admin are denied writes by RLS
    await db.transaction(async (tx) => {
      await tx.exec("set local role authenticated");
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [DEFAULT_BOOKINGS_ADMIN_ID]);
      await tx.query("select set_config('request.jwt.claim.aal', 'aal2', true)");
      await expect(
        tx.query(
          `insert into hero_slides (image_public_id, alt_text) values ('/media/x.jpg', 'Unauthorized insert')`
        )
      ).rejects.toThrow(/row-level security policy/i);
    });

    await db.transaction(async (tx) => {
      await tx.exec("set local role authenticated");
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [DEFAULT_CONTENT_ADMIN_ID]);
      await tx.query("select set_config('request.jwt.claim.aal', 'aal1', true)");
      await expect(
        tx.query(
          `insert into hero_slides (image_public_id, alt_text) values ('/media/x.jpg', 'AAL1 insert blocked')`
        )
      ).rejects.toThrow(/row-level security policy/i);
    });

    // Update focal point and clear optional headline back to null
    const updatedS1 = await updateAdminHeroSlide(contentAdmin, {
      id: s1.id,
      focal_x: 40,
      focal_y: 18,
      headline: null,
    });
    expect(updatedS1.focal_x).toBe(40);
    expect(updatedS1.focal_y).toBe(18);
    expect(updatedS1.headline).toBeNull();

    // Atomic reorder: swap s2 before s1, plus make s3 active at end
    await updateAdminHeroSlide(contentAdmin, { id: s3.id, is_active: true });
    const afterReorder = await reorderAdminHeroSlides(contentAdmin, {
      orderedIds: [s2.id, s1.id, s3.id],
    });
    expect(afterReorder.map((s) => s.id)).toEqual([s2.id, s1.id, s3.id]);

    // Hide s2 and verify public order reflects [s1, s3]
    await updateAdminHeroSlide(contentAdmin, { id: s2.id, is_active: false });
    const publicAfter = await getPublicHeroSlides();
    expect(publicAfter.map((s) => s.id)).toEqual([s1.id, s3.id]);

    // Clean deletes
    await deleteAdminHeroSlide(contentAdmin, s1.id);
    await deleteAdminHeroSlide(contentAdmin, s2.id);
    await deleteAdminHeroSlide(contentAdmin, s3.id);
    expect(await listAdminHeroSlides(contentAdmin)).toEqual([]);
  });
});
