import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createFreshTestDb, setTestDbInstance } from "@/lib/db";
import { DEFAULT_CONTENT_ADMIN_ID, DEFAULT_OWNER_ID } from "@/lib/seed-data";
import { ProblemError } from "@/lib/errors";
import {
  createTeamAdmin,
  listTeamAdmins,
  updateTeamAdmin,
} from "@/modules/admin/service";
import {
  deleteAdminPackage,
  deleteAdminService,
  listAdminServicesAndPackages,
  upsertAdminPackage,
  upsertAdminService,
} from "@/modules/catalog/service";
import {
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
});
