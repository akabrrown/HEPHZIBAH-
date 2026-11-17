import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AdminSessionPayload } from "@/lib/auth";
import { createFreshTestDb, setTestDbInstance, withServiceRole } from "@/lib/db";
import { DEFAULT_OWNER_ID } from "@/lib/seed-data";
import {
  addBlockedDateAdmin,
  getBookingDetailForAdmin,
  getPublicUnavailableDates,
  listBookingsForAdmin,
  submitBookingRequest,
  transitionBookingByAdmin,
} from "@/modules/booking/service";
import { getPublicCatalogue } from "@/modules/catalog/service";
import { processEmailOutbox } from "@/modules/notify/service";
import { addAdminMediaAsset, upsertAdminPortfolioItem } from "@/modules/portfolio/service";
import {
  acceptQuoteByClient,
  expireDueQuotes,
  recordPaymentAdmin,
  reviseQuoteAdmin,
  sendQuoteAdmin,
  upsertDraftQuoteAdmin,
} from "@/modules/quoting/service";

describe("Full booking, quoting, outbox retry, and portfolio lifecycle", () => {
  let ownerSession: AdminSessionPayload;
  let photoServiceId: string;
  let weddingOccasionId: string;
  let designServiceId: string;

  beforeAll(async () => {
    const db = await createFreshTestDb();
    setTestDbInstance(db);
    ownerSession = {
      adminId: DEFAULT_OWNER_ID,
      email: "owner@hephzibahmedia.com",
      displayName: "Kofi Mensah (Owner)",
      scopes: ["bookings", "content", "settings", "team"],
      aal: "aal2",
      exp: Math.floor(Date.now() / 1000) + 3600,
      jti: "test-jti",
    };

    const catalogue = await getPublicCatalogue();
    photoServiceId = catalogue.services.find((s) => s.slug === "event-photography")!.id;
    designServiceId = catalogue.services.find((s) => s.slug === "logo-and-brand-identity")!.id;
    weddingOccasionId = catalogue.occasions.find((o) => o.slug === "wedding")!.id;
  });

  afterAll(async () => {
    // Cleanup happens when test runner exits
  });

  it("handles idempotent booking intake, quote send/revise/accept, deposit, and overlap conflict", async () => {
    const targetDate = "2027-07-17";
    const idemKey = "integration-idem-001";

    const first = await submitBookingRequest(
      {
        kind: "photography",
        serviceId: photoServiceId,
        occasionId: weddingOccasionId,
        eventDate: targetDate,
        timeOfDay: "morning",
        venueText: "St. Thomas Church",
        venueCity: "Accra",
        guestCount: 220,
        brief: "Morning church vows followed by family reception portraits in East Legon.",
        referenceLinks: ["https://example.com/lookbook"],
        clientName: "Nana Yaw Boateng",
        clientEmail: "nanayaw@ghana.example",
        clientPhone: "024 555 0199",
        preferredContact: "whatsapp",
        consentAccepted: true,
        privacyVersion: "1.0",
        termsVersion: "1.0",
      },
      idemKey
    );

    expect(first.reference).toMatch(/^HM-\d{4}-[A-Z2-9]{5}$/);
    expect(first.isReplay).toBe(false);

    // Extract raw token from statusUrl
    const rawToken = new URL(`http://localhost${first.statusUrl}`).searchParams.get("t")!;
    expect(rawToken).toBeTruthy();

    // Replay returns same reference
    const replay = await submitBookingRequest(
      {
        kind: "photography",
        serviceId: photoServiceId,
        occasionId: weddingOccasionId,
        eventDate: targetDate,
        timeOfDay: "morning",
        venueCity: "Accra",
        brief: "Morning church vows followed by family reception portraits in East Legon.",
        clientName: "Nana Yaw Boateng",
        clientEmail: "nanayaw@ghana.example",
        clientPhone: "024 555 0199",
        preferredContact: "whatsapp",
        consentAccepted: true,
        privacyVersion: "1.0",
        termsVersion: "1.0",
      },
      idemKey
    );
    expect(replay.isReplay).toBe(true);
    expect(replay.reference).toBe(first.reference);

    // Search by last 4 digits of phone ("0199") finds booking (FR-32)
    const searchRes = await listBookingsForAdmin(ownerSession, { q: "0199" });
    expect(searchRes.items.some((b) => b.reference === first.reference)).toBe(true);

    const bookingId = searchRes.items.find((b) => b.reference === first.reference)!.id;

    // Opening detail moves status new -> reviewing
    const detail = await getBookingDetailForAdmin(ownerSession, bookingId);
    expect(detail.booking.status).toBe("reviewing");

    // Create draft quote v1 & send
    const draftV1 = await upsertDraftQuoteAdmin(ownerSession, bookingId, {
      items: [{ description: "Wedding ceremony coverage", quantity: 1, unit_price_minor: 350000 }],
      deposit_minor: 150000,
      starts_at: `${targetDate}T09:00:00Z`,
      ends_at: `${targetDate}T14:00:00Z`,
    });
    const sentV1 = await sendQuoteAdmin(ownerSession, bookingId, draftV1.id);
    expect(sentV1.status).toBe("sent");

    // Revise quote -> v1 superseded, v2 draft -> send v2
    const draftV2 = await reviseQuoteAdmin(ownerSession, bookingId, sentV1.id);
    expect(draftV2.version).toBe(2);
    const updatedV2 = await upsertDraftQuoteAdmin(ownerSession, bookingId, {
      quote_id: draftV2.id,
      items: [
        { description: "Wedding ceremony coverage", quantity: 1, unit_price_minor: 350000 },
        { description: "Reception extension (2 hrs)", quantity: 1, unit_price_minor: 80000 },
      ],
      deposit_minor: 200000,
      starts_at: `${targetDate}T09:00:00Z`,
      ends_at: `${targetDate}T14:00:00Z`,
    });
    const sentV2 = await sendQuoteAdmin(ownerSession, bookingId, updatedV2.id);
    expect(sentV2.total_minor).toBe(430000);

    // Date is NOT blocked publicly yet (BR-03)
    const availBeforeConfirm = await getPublicUnavailableDates(targetDate, targetDate);
    expect(availBeforeConfirm.dates).not.toContain(targetDate);

    // Client accepts v2 on status page
    const acceptRes = await acceptQuoteByClient(first.reference, rawToken, { quoteId: sentV2.id });
    expect(acceptRes.status).toBe("accepted");

    // Trying to confirm without deposit fails
    await expect(
      transitionBookingByAdmin(ownerSession, bookingId, { to: "confirmed" })
    ).rejects.toThrow(/deposit/i);

    // Record manual MoMo deposit
    await recordPaymentAdmin(ownerSession, bookingId, {
      method: "momo",
      amount_minor: 200000,
      provider_reference: "MOMO-ACC-88412",
      received_at: "2027-07-01T12:00:00Z",
    });

    // Confirm succeeds
    const confirmed = await transitionBookingByAdmin(ownerSession, bookingId, {
      to: "confirmed",
      startsAt: `${targetDate}T09:00:00Z`,
      endsAt: `${targetDate}T14:00:00Z`,
    });
    expect(confirmed.status).toBe("confirmed");

    // Date IS now unavailable publicly
    const availAfterConfirm = await getPublicUnavailableDates(targetDate, targetDate);
    expect(availAfterConfirm.dates).toContain(targetDate);

    // Second booking on same date cannot confirm overlapping window, and new intake for that date gets 409
    await expect(
      submitBookingRequest({
        kind: "photography",
        serviceId: photoServiceId,
        occasionId: weddingOccasionId,
        eventDate: targetDate,
        timeOfDay: "afternoon",
        venueCity: "Tema",
        brief: "Afternoon traditional event coverage in Tema Community 11.",
        clientName: "Akua Sarpong",
        clientEmail: "akua@ghana.example",
        clientPhone: "020 333 9988",
        preferredContact: "whatsapp",
        consentAccepted: true,
        privacyVersion: "1.0",
        termsVersion: "1.0",
      })
    ).rejects.toThrow(/already booked|no longer available/i);
  });

  it("retries failed email outbox deliveries without losing messages, and expires overdue quotes", async () => {
    const sub = await submitBookingRequest({
      kind: "design",
      serviceId: designServiceId,
      deadline: "2027-08-20",
      deliverableFormats: ["Logo files (SVG / PNG)", "Print PDF"],
      brief: "Brand identity refresh and packaging label design for a spice maker.",
      clientName: "Esi Koomson",
      clientEmail: "esi@spices.example",
      clientPhone: "055 212 3434",
      preferredContact: "email",
      consentAccepted: true,
      privacyVersion: "1.0",
      termsVersion: "1.0",
    });

    const list = await listBookingsForAdmin(ownerSession, { q: sub.reference });
    const bookingId = list.items[0]!.id;
    const draft = await upsertDraftQuoteAdmin(ownerSession, bookingId, {
      items: [{ description: "Identity package", quantity: 1, unit_price_minor: 250000 }],
      deposit_minor: 125000,
    });
    const sent = await sendQuoteAdmin(ownerSession, bookingId, draft.id);

    // Force quote past validity and verify expireDueQuotes moves booking to expired
    await withServiceRole(async (tx) => {
      await tx.query(
        `update quotes set valid_until = now() - interval '2 hours' where id = $1::uuid`,
        [sent.id]
      );
      await tx.query(
        `insert into email_outbox (dedupe_key, to_email, template, payload, status, next_attempt_at)
         values ('retry-test-' || gen_random_uuid(), 'esi@spices.example', 'quote_sent', '{"reference":"HM-2611-RETRY"}'::jsonb, 'pending', now())`
      );
    });

    // Failing transport marks row failed, then healthy transport delivers it
    const failResult = await processEmailOutbox({
      async send() {
        throw new Error("Simulated Resend 503 outage");
      },
    });
    expect(failResult.failed).toBeGreaterThanOrEqual(1);

    // Reset next_attempt_at to due now and retry with healthy transport
    await withServiceRole(async (tx) => {
      await tx.query(`update email_outbox set next_attempt_at = now() where status = 'failed'`);
    });
    const retryResult = await processEmailOutbox({
      async send() {
        return;
      },
    });
    expect(retryResult.sent).toBeGreaterThanOrEqual(1);

    const expiredCount = await expireDueQuotes();
    expect(expiredCount).toBe(1);

    const detail = await getBookingDetailForAdmin(ownerSession, bookingId);
    expect(detail.booking.status).toBe("expired");
  });

  it("enforces blocked dates on availability and blocks portfolio publishing without consent", async () => {
    const blockedDay = "2027-09-12";
    await addBlockedDateAdmin(ownerSession, {
      fromDate: blockedDay,
      toDateInclusive: blockedDay,
      reason: "Studio maintenance",
    });
    const avail = await getPublicUnavailableDates(blockedDay, blockedDay);
    expect(avail.dates).toContain(blockedDay);

    const draftItem = await upsertAdminPortfolioItem(ownerSession, {
      kind: "photography",
      slug: "integration-consent-check",
      title: "Consent Check Shoot",
      client_consent_to_publish: false,
      status: "draft",
    });

    await addAdminMediaAsset(ownerSession, draftItem.id, {
      type: "image",
      is_cover: true,
      cloudinary_public_id: "local/cathedral-wedding-cover",
      width: 1500,
      height: 1000,
      alt_text: "Wide cathedral wedding procession frame",
    });

    // Attempting to publish without client consent must reject
    await expect(
      upsertAdminPortfolioItem(ownerSession, {
        id: draftItem.id,
        kind: "photography",
        slug: "integration-consent-check",
        title: "Consent Check Shoot",
        client_consent_to_publish: false,
        status: "published",
      })
    ).rejects.toThrow(/consent/i);
  });
});
