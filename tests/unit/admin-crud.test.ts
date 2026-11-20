import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { NextRequest } from "next/server";
import { GET as getHealth } from "@/app/api/health/route";
import { POST as postAdminSignIn } from "@/app/api/admin/auth/sign-in/route";
import { createFreshTestDb, setTestDbInstance } from "@/lib/db";
import { ProblemError } from "@/lib/errors";
import { resetRateLimitBuckets } from "@/lib/rate-limit";
import {
  DEFAULT_CONTENT_ADMIN_ID,
  DEFAULT_OWNER_ID,
  getSeedAdminPassword,
} from "@/lib/seed-data";
import {
  authenticateAdminPassword,
  createTeamAdmin,
  listTeamAdmins,
  updateTeamAdmin,
} from "@/modules/admin/service";
import { submitBookingRequest } from "@/modules/booking/service";
import {
  deleteAdminPackage,
  deleteAdminService,
  listAdminServicesAndPackages,
  upsertAdminPackage,
  upsertAdminService,
} from "@/modules/catalog/service";
import {
  addAdminMediaAsset,
  deleteAdminFaq,
  deleteAdminPortfolioItem,
  deleteAdminTestimonial,
  listAdminContent,
  listAdminPortfolio,
  upsertAdminFaq,
  upsertAdminPortfolioItem,
  upsertAdminTestimonial,
} from "@/modules/portfolio/service";
import type { AdminSessionPayload } from "@/lib/auth";

describe("Admin CRUD & Delete operations", () => {
  let db: PGlite;

  const contentAdmin: AdminSessionPayload = {
    adminId: DEFAULT_CONTENT_ADMIN_ID,
    email: "content@hephzibahmedia.com",
    displayName: "Content Lead",
    scopes: ["content"],
    aal: "aal2",
    exp: Math.floor(Date.now() / 1000) + 3600,
    jti: "test-jti-crud",
  };

  beforeAll(async () => {
    db = await createFreshTestDb();
    setTestDbInstance(db);
  });

  afterAll(async () => {
    setTestDbInstance(null as unknown as PGlite);
    await db.close();
  });

  it("creates, updates, and deletes services & packages", async () => {
    // 1. Create service
    const createdService = await upsertAdminService(contentAdmin, {
      kind: "photography",
      slug: "brand-commercials",
      name: "Brand Commercials",
      summary: "High-end visual storytelling for modern brands.",
      description_md: "Full description here",
      starting_price_minor: 500000,
      sort_order: 10,
      is_active: true,
    });
    expect(createdService.id).toBeDefined();
    expect(createdService.name).toBe("Brand Commercials");

    // 2. Create package linked to this service
    const createdPackage = await upsertAdminPackage(contentAdmin, {
      service_id: createdService.id,
      name: "Executive Brand Sprint",
      summary: "One-day full brand photo suite.",
      price_minor: 750000,
      duration_hours: 6.0,
      deliverables: ["40 retouched assets", "Commercial release license"],
      is_featured: true,
      sort_order: 1,
      is_active: true,
    });
    expect(createdPackage.id).toBeDefined();
    expect(createdPackage.service_id).toBe(createdService.id);

    // 3. Verify in list
    const catalog = await listAdminServicesAndPackages(contentAdmin);
    expect(catalog.services.some((s) => s.id === createdService.id)).toBe(true);
    expect(catalog.packages.some((p) => p.id === createdPackage.id)).toBe(true);

    // 4. Delete package
    await deleteAdminPackage(contentAdmin, createdPackage.id);
    const afterPkgDel = await listAdminServicesAndPackages(contentAdmin);
    expect(afterPkgDel.packages.some((p) => p.id === createdPackage.id)).toBe(false);

    // 5. Re-create a package, then delete the service to test cascading deletion of packages
    const pkg2 = await upsertAdminPackage(contentAdmin, {
      service_id: createdService.id,
      name: "Another Package",
      price_minor: 300000,
      deliverables: ["Deliverable"],
      sort_order: 2,
      is_active: true,
    });
    await deleteAdminService(contentAdmin, createdService.id);
    const afterSrvDel = await listAdminServicesAndPackages(contentAdmin);
    expect(afterSrvDel.services.some((s) => s.id === createdService.id)).toBe(false);
    expect(afterSrvDel.packages.some((p) => p.id === pkg2.id)).toBe(false);
  });

  it("creates, updates, and deletes testimonials & faqs", async () => {
    // 1. Create testimonial
    const testimonial = await upsertAdminTestimonial(contentAdmin, {
      author_name: "Nana Akuffo",
      author_context: "CEO, Tech Hub Accra",
      quote: "Hephzibah delivered an unforgettable visual identity and media package for our annual launch.",
      consent_to_publish: true,
      status: "published",
      sort_order: 5,
    });
    expect(testimonial.id).toBeDefined();

    // 2. Create FAQ
    const faq = await upsertAdminFaq(contentAdmin, {
      question: "Do you travel across West Africa for projects?",
      answer: "Yes, our team regularly covers regional summits and destination events across Ghana and West Africa.",
      sort_order: 1,
      is_published: true,
    });
    expect(faq.id).toBeDefined();

    // 3. Verify in list
    const content = await listAdminContent(contentAdmin);
    expect(content.testimonials.some((t) => t.id === testimonial.id)).toBe(true);
    expect(content.faqs.some((f) => f.id === faq.id)).toBe(true);

    // 4. Delete testimonial & FAQ
    await deleteAdminTestimonial(contentAdmin, testimonial.id);
    await deleteAdminFaq(contentAdmin, faq.id);

    const afterDelete = await listAdminContent(contentAdmin);
    expect(afterDelete.testimonials.some((t) => t.id === testimonial.id)).toBe(false);
    expect(afterDelete.faqs.some((f) => f.id === faq.id)).toBe(false);
  });

  it("creates, updates, and deletes portfolio items", async () => {
    // 1. Create portfolio draft
    const item = await upsertAdminPortfolioItem(contentAdmin, {
      kind: "photography",
      slug: "tech-summit-accra-2026",
      title: "Tech Summit Accra 2026",
      summary: "Executive coverage for the annual West Africa innovation summit.",
      status: "draft",
      client_consent_to_publish: true,
      sort_order: 1,
    });
    expect(item.id).toBeDefined();

    // 2. Verify in list
    const portfolioList = await listAdminPortfolio(contentAdmin);
    expect(portfolioList.some((p) => p.id === item.id)).toBe(true);

    // 3. Delete portfolio item
    await deleteAdminPortfolioItem(contentAdmin, item.id);
    const afterDel = await listAdminPortfolio(contentAdmin);
    expect(afterDel.some((p) => p.id === item.id)).toBe(false);
  });

  it("creates and updates team admins and returns fieldErrors on 422 validation failures", async () => {
    const teamAdmin: AdminSessionPayload = {
      adminId: DEFAULT_OWNER_ID,
      email: "owner@hephzibahmedia.com",
      displayName: "Kofi Mensah (Owner)",
      scopes: ["bookings", "content", "settings", "team"],
      aal: "aal2",
      exp: Math.floor(Date.now() / 1000) + 3600,
      jti: "test-jti-team",
    };

    // 1. Create valid team admin
    const created = await createTeamAdmin(teamAdmin, {
      email: "newstaff@hephzibahmedia.com",
      display_name: "Abena Mensah",
      password: "UniqueStudio#2026!Accra",
      scopes: ["bookings"],
    });
    expect(created.user.email).toBe("newstaff@hephzibahmedia.com");
    expect(created.totpSecret.length).toBeGreaterThan(10);
    expect(created.sampleCode).toMatch(/^\d{6}$/);

    const members = await listTeamAdmins(teamAdmin);
    expect(members.some((m) => m.id === created.user.id)).toBe(true);

    // 2. Update scopes & rotate TOTP
    const updated = await updateTeamAdmin(teamAdmin, {
      id: created.user.id,
      scopes: ["bookings", "content"],
      reset_totp: true,
    });
    expect(updated.user.scopes).toEqual(["bookings", "content"]);
    expect(updated.newTotpSecret).toBeDefined();

    // 3. Verify 422 validation errors include actionable fieldErrors on both create and update
    let createErr: unknown;
    try {
      await createTeamAdmin(teamAdmin, {
        email: "not-an-email",
        display_name: "",
        password: "short",
        scopes: [],
      });
    } catch (e) {
      createErr = e;
    }
    expect(createErr).toBeInstanceOf(ProblemError);
    expect((createErr as ProblemError).status).toBe(422);
    expect((createErr as ProblemError).fieldErrors?.email).toBeDefined();
    expect((createErr as ProblemError).fieldErrors?.password).toBeDefined();

    let updateErr: unknown;
    try {
      await updateTeamAdmin(teamAdmin, {
        id: "not-a-uuid",
      });
    } catch (e) {
      updateErr = e;
    }
    expect(updateErr).toBeInstanceOf(ProblemError);
    expect((updateErr as ProblemError).status).toBe(422);
    expect((updateErr as ProblemError).fieldErrors?.id).toBeDefined();
  });

  it("blocks deleting a service with existing bookings (409) and includes cover_asset in admin portfolio list", async () => {
    const svc = await upsertAdminService(contentAdmin, {
      kind: "design",
      slug: "editorial-layout-test",
      name: "Editorial Layout Test",
      summary: "Custom publication and print systems.",
      starting_price_minor: 200000,
      sort_order: 20,
      is_active: true,
    });

    const linkedPkg = await upsertAdminPackage(contentAdmin, {
      service_id: svc.id,
      name: "Editorial Core Package",
      price_minor: 200000,
      deliverables: ["Editorial layout"],
      sort_order: 1,
      is_active: true,
    });

    await submitBookingRequest({
      kind: "design",
      serviceId: svc.id,
      deadline: "2027-11-15",
      brief: "Corporate annual report layout and print production supervision.",
      clientName: "Kofi Boateng",
      clientEmail: "kofi.boateng@ghana.example",
      clientPhone: "024 111 2222",
      preferredContact: "email",
      consentAccepted: true,
      privacyVersion: "1.0",
      termsVersion: "1.0",
    });

    await expect(deleteAdminService(contentAdmin, svc.id)).rejects.toMatchObject({
      status: 409,
      code: "in_use",
    });

    const afterRollback = await listAdminServicesAndPackages(contentAdmin);
    expect(afterRollback.packages.some((p) => p.id === linkedPkg.id)).toBe(true);

    const ownerAdmin: AdminSessionPayload = {
      adminId: DEFAULT_OWNER_ID,
      email: "owner@hephzibahmedia.com",
      displayName: "Kofi Mensah (Owner)",
      scopes: ["bookings", "content", "settings", "team"],
      aal: "aal2",
      exp: Math.floor(Date.now() / 1000) + 3600,
      jti: "test-jti-owner-del",
    };

    await expect(deleteAdminService(ownerAdmin, svc.id)).rejects.toMatchObject({
      status: 409,
      code: "service_in_use",
    });

    const pf = await upsertAdminPortfolioItem(contentAdmin, {
      kind: "design",
      slug: "cover-asset-admin-test",
      title: "Cover Asset Admin Test",
      status: "draft",
      client_consent_to_publish: false,
      sort_order: 2,
    });

    const asset = await addAdminMediaAsset(contentAdmin, pf.id, {
      type: "image",
      is_cover: true,
      cloudinary_public_id: "local/design-identity-cover",
      width: 1600,
      height: 1000,
      alt_text: "Brand stationery and editorial guidelines cover preview",
    });

    const portfolioList = await listAdminPortfolio(contentAdmin);
    const listed = portfolioList.find((p) => p.id === pf.id);
    expect(listed?.cover_asset?.id).toBe(asset.id);
    expect(listed?.cover_asset?.cloudinary_public_id).toBe("local/design-identity-cover");
  });

  it("omits totpHint from sign-in response, enforces pre-verify lockout, and serves /api/health telemetry", async () => {
    resetRateLimitBuckets();
    const seedPass = getSeedAdminPassword();

    const validReq = new NextRequest("http://localhost:3000/api/admin/auth/sign-in", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0",
        "x-forwarded-for": "10.0.0.21",
      },
      body: JSON.stringify({
        email: "owner@hephzibahmedia.com",
        password: seedPass,
      }),
    });
    const validRes = await postAdminSignIn(validReq);
    expect(validRes.status).toBe(200);
    expect(validRes.headers.get("Server-Timing")).toContain("app;dur=");
    const validJson = (await validRes.json()) as Record<string, unknown>;
    expect(validJson.nextStep).toBe("verify_totp");
    expect(validJson).not.toHaveProperty("totpHint");
    expect(validJson).not.toHaveProperty("totpSecret");

    for (let i = 0; i < 5; i++) {
      await expect(
        authenticateAdminPassword(
          { email: "content@hephzibahmedia.com", password: "WrongPassword#999" },
          "10.0.0.22"
        )
      ).rejects.toMatchObject({ status: 401 });
    }
    await expect(
      authenticateAdminPassword(
        { email: "content@hephzibahmedia.com", password: "WrongPassword#999" },
        "10.0.0.22"
      )
    ).rejects.toMatchObject({ status: 429, code: "account_locked" });

    // Even a valid password is now pre-blocked with 429 before DB/password check
    await expect(
      authenticateAdminPassword(
        { email: "content@hephzibahmedia.com", password: seedPass },
        "10.0.0.22"
      )
    ).rejects.toMatchObject({ status: 429, code: "account_locked" });

    const healthReq = new NextRequest("http://localhost:3000/api/health", {
      headers: { "user-agent": "Mozilla/5.0", "x-forwarded-for": "10.0.0.23" },
    });
    const healthRes = await getHealth(healthReq);
    expect(healthRes.status).toBe(200);
    expect(healthRes.headers.get("Server-Timing")).toContain("db;dur=");
    expect(healthRes.headers.get("Cache-Control")).toContain("s-maxage=15");
  });
});
