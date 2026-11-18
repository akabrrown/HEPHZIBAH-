import { revalidatePath } from "next/cache";
import type { AdminSessionPayload } from "@/lib/auth";
import { getCached, invalidateCache, setCached } from "@/lib/cache";
import {
  addDaysIso,
  diffDaysIso,
  getAccraTodayIso,
  getEarliestSelectableDate,
  getLatestSelectableDate,
  normalizeGhanaPhone,
} from "@/lib/dates";
import { withAdminRole, withAnonRole, withServiceRole } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { ProblemError } from "@/lib/errors";
import { isHoneypotTriggered } from "@/lib/rate-limit";
import {
  generateAccessToken,
  generateBookingReference,
  hashAccessToken,
  safeCompare,
} from "@/lib/tokens";
import { findSiteSettings } from "@/modules/catalog/repository";
import type { ServiceKind, SiteSettings } from "@/modules/catalog/schema";
import { enqueueOutboxEmail } from "@/modules/notify/repository";
import { processEmailOutbox } from "@/modules/notify/service";
import {
  findAdminBookings,
  findBlockedDatesAdmin,
  findBookingById,
  findBookingByReference,
  findBookingEvents,
  findCalendarBookingsAdmin,
  findUnavailableDatesInRange,
  updateBookingGalleryDelivery,
} from "./repository";
import {
  blockedDateCreateSchema,
  bookingRequestSchema,
  bookingTransitionSchema,
  canTransitionBooking,
  clientCancelSchema,
  galleryDeliverySchema,
  type BlockedDateRange,
  type BookingEventRecord,
  type BookingRecord,
  type BookingStatus,
} from "./schema";
import type { PaymentRecord, QuoteRecord } from "@/modules/quoting/schema";
import { findPaymentsByBookingId, findQuotesByBookingId } from "@/modules/quoting/repository";

export const CLIENT_STATUS_HEADLINES: Record<BookingStatus, string> = {
  new: "Request received",
  reviewing: "We are preparing your quote",
  quoted: "Your quote is ready",
  accepted: "Quote accepted: deposit needed to secure the date",
  confirmed: "You are booked",
  completed: "All done",
  declined: "We cannot take this one",
  cancelled: "This request was cancelled",
  expired: "Your quote has expired",
};

export async function getPublicUnavailableDates(
  fromDate?: string,
  toDate?: string
): Promise<{ dates: string[]; minLeadDays: number; maxAdvanceDays: number }> {
  const today = getAccraTodayIso();
  const from = fromDate ?? today;
  const to = toDate ?? addDaysIso(from, 400);

  const cacheKey = `booking:unavailable:${from}:${to}`;
  const cached = getCached<{ dates: string[]; minLeadDays: number; maxAdvanceDays: number }>(cacheKey);
  if (cached) return cached;

  const settings = await withAnonRole((tx) => findSiteSettings(tx));

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    throw new ProblemError(422, "invalid_range", "Invalid date range", "Use YYYY-MM-DD dates.");
  }
  const span = diffDaysIso(from, to);
  if (span < 0 || span > 400) {
    throw new ProblemError(
      422,
      "invalid_range",
      "Date range out of bounds",
      "Availability range must be between 0 and 400 days."
    );
  }

  const dates = await withAnonRole((tx) => findUnavailableDatesInRange(tx, from, to));
  const result = {
    dates,
    minLeadDays: settings.min_lead_days,
    maxAdvanceDays: settings.max_advance_days,
  };
  setCached(cacheKey, result, 60);
  return result;
}

export interface BookingSubmitResult {
  reference: string;
  statusUrl: string;
  isReplay: boolean;
  honeypotSkipped?: boolean;
}

export async function submitBookingRequest(
  rawInput: unknown,
  idempotencyKeyHeader?: string | null
): Promise<BookingSubmitResult> {
  const parsed = bookingRequestSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ProblemError(
      422,
      "validation_error",
      "Check your booking details",
      "Please fix the highlighted fields before sending your request.",
      { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
    );
  }

  const v = parsed.data;
  if (isHoneypotTriggered(v.website)) {
    const dummyRef = generateBookingReference();
    console.info(JSON.stringify({ level: "warn", event: "booking_honeypot_triggered", dummyRef }));
    return {
      reference: dummyRef,
      statusUrl: `/book/confirmation/${dummyRef}`,
      isReplay: false,
      honeypotSkipped: true,
    };
  }

  const normalizedPhone = normalizeGhanaPhone(v.clientPhone);
  if (!normalizedPhone) {
    throw new ProblemError(422, "validation_error", "Check your phone number", "Enter a valid Ghana or international number.", {
      fieldErrors: { clientPhone: ["Enter a valid phone number."] },
    });
  }

  const idempotencyKey =
    idempotencyKeyHeader && idempotencyKeyHeader.trim().length > 0
      ? idempotencyKeyHeader.trim().slice(0, 128)
      : `auto-${generateAccessToken().slice(0, 24)}`;

  const env = getServerEnv();

  const result = await withServiceRole(async (tx) => {
    const existing = await tx.query<{ reference: string }>(
      `select reference from bookings where idempotency_key = $1`,
      [idempotencyKey]
    );
    if (existing.rows[0]) {
      const ref = existing.rows[0].reference;
      return {
        reference: ref,
        statusUrl: `/book/confirmation/${ref}`,
        isReplay: true,
      };
    }

    const settings = await findSiteSettings(tx);
    const earliest = getEarliestSelectableDate(settings.min_lead_days);
    const latest = getLatestSelectableDate(settings.max_advance_days);

    // Validate service, package, and occasion against catalogue
    const svcRes = await tx.query<{ id: string; kind: ServiceKind; name: string; is_active: boolean }>(
      `select id, kind, name, is_active from services where id = $1::uuid`,
      [v.serviceId]
    );
    const svc = svcRes.rows[0];
    if (!svc || !svc.is_active || svc.kind !== v.kind) {
      throw new ProblemError(422, "invalid_service", "Service unavailable", "Pick an active service matching the selected category.");
    }

    if (v.packageId) {
      const pkgRes = await tx.query<{ id: string }>(
        `select id from packages where id = $1::uuid and service_id = $2::uuid and is_active`,
        [v.packageId, v.serviceId]
      );
      if (!pkgRes.rows[0]) {
        throw new ProblemError(422, "invalid_package", "Package unavailable", "The selected package does not match this service.");
      }
    }

    if (v.occasionId) {
      const occRes = await tx.query<{ id: string }>(
        `select id from occasions where id = $1::uuid and is_active and $2::service_kind = any(applies_to)`,
        [v.occasionId, v.kind]
      );
      if (!occRes.rows[0]) {
        throw new ProblemError(422, "invalid_occasion", "Occasion unavailable", "Pick an active occasion for this service.");
      }
    }

    if (v.kind === "design") {
      if (!v.deadline || v.deadline < earliest || v.deadline > latest) {
        throw new ProblemError(
          422,
          "lead_time_violation",
          "Deadline inside minimum lead time",
          `Online requests need at least ${settings.min_lead_days} days' notice. Message us on WhatsApp for urgent deadlines.`,
          { fieldErrors: { deadline: [`Choose a date from ${earliest} onward.`] } }
        );
      }
    } else {
      if (!v.eventDate || v.eventDate < earliest || v.eventDate > latest) {
        throw new ProblemError(
          422,
          "lead_time_violation",
          "Date inside minimum lead time",
          `We need at least ${settings.min_lead_days} days' notice online. Message us on WhatsApp if your event is sooner.`,
          { fieldErrors: { eventDate: [`Pick a date between ${earliest} and ${latest}.`] } }
        );
      }

      const unavailable = await findUnavailableDatesInRange(tx, v.eventDate, v.eventDate);
      if (unavailable.includes(v.eventDate)) {
        throw new ProblemError(
          409,
          "date_unavailable",
          "That date is no longer available",
          "We are already booked that day. Pick another date or message us on WhatsApp if it is urgent."
        );
      }
    }

    const composedBrief =
      v.kind === "design" && v.deliverableFormats && v.deliverableFormats.length > 0
        ? `${v.brief.trim()}\n\nDeliverable formats: ${v.deliverableFormats.join(", ")}`
        : v.brief.trim();

    const reference = generateBookingReference();
    const rawToken = generateAccessToken();
    const tokenHash = hashAccessToken(rawToken);

    const rpcPayload = {
      reference,
      idempotency_key: idempotencyKey,
      access_token_hash: tokenHash,
      kind: v.kind,
      service_id: v.serviceId,
      package_id: v.packageId ?? "",
      occasion_id: v.occasionId ?? "",
      occasion_other: v.occasionOther ?? "",
      client_name: v.clientName.trim(),
      client_email: v.clientEmail.trim(),
      client_phone: normalizedPhone,
      preferred_contact: v.preferredContact,
      event_date: v.kind === "design" ? "" : (v.eventDate ?? ""),
      time_of_day: v.kind === "design" ? "" : (v.timeOfDay ?? ""),
      venue_text: v.venueText ?? "",
      venue_city: v.venueCity ?? "",
      guest_count: v.guestCount ? String(v.guestCount) : "",
      deadline: v.kind === "design" ? (v.deadline ?? "") : "",
      brief: composedBrief.slice(0, 4000),
      budget_band: v.budgetBand ?? "",
      reference_links: v.referenceLinks ?? [],
      source: v.source ?? "",
      privacy_version: v.privacyVersion,
      terms_version: v.termsVersion,
    };

    const refRes = await tx.query<{ ref: string }>(
      `select create_booking_request($1::jsonb) as ref`,
      [JSON.stringify(rpcPayload)]
    );
    const createdRef = refRes.rows[0]!.ref;
    const statusUrl = `${env.NEXT_PUBLIC_SITE_URL}/booking/status/${encodeURIComponent(createdRef)}?t=${encodeURIComponent(rawToken)}`;

    const createdBooking = await findBookingByReference(tx, createdRef);
    if (createdBooking) {
      await tx.query(
        `update email_outbox
            set payload = payload || $2::jsonb
          where dedupe_key = 'booking-received:' || $1`,
        [
          createdBooking.id,
          JSON.stringify({
            reference: createdRef,
            client_name: v.clientName.trim(),
            service_name: svc.name,
            event_date: createdBooking.event_date,
            deadline: createdBooking.deadline,
            status_url: statusUrl,
          }),
        ]
      );
      await tx.query(
        `update email_outbox
            set payload = payload || $2::jsonb
          where dedupe_key = 'admin-new-request:' || $1`,
        [
          createdBooking.id,
          JSON.stringify({
            reference: createdRef,
            client_name: v.clientName.trim(),
            service_name: svc.name,
          }),
        ]
      );
    }

    return {
      reference: createdRef,
      statusUrl: `/booking/status/${encodeURIComponent(createdRef)}?t=${encodeURIComponent(rawToken)}`,
      isReplay: false,
    };
  });

  if (!result.isReplay) {
    await processEmailOutbox().catch(() => undefined);
  }

  return result;
}

export interface ClientBookingStatusView {
  booking: {
    id: string;
    reference: string;
    status: BookingStatus;
    headline: string;
    kind: ServiceKind;
    service_name: string;
    package_name: string | null;
    occasion_name: string | null;
    client_name: string;
    event_date: string | null;
    time_of_day: string | null;
    venue_text: string | null;
    venue_city: string | null;
    deadline: string | null;
    starts_at: string | null;
    ends_at: string | null;
    cancelled_reason: string | null;
    gallery_url: string | null;
    gallery_pin: string | null;
    gallery_notes: string | null;
    gallery_expires_at: string | null;
    created_at: string;
  };
  events: BookingEventRecord[];
  activeQuote: QuoteRecord | null;
  payments: Array<Pick<PaymentRecord, "id" | "method" | "amount_minor" | "is_refund" | "currency" | "received_at" | "provider_reference">>;
  settings: Pick<SiteSettings, "business_name" | "whatsapp_e164" | "phone_e164" | "contact_email" | "social">;
}

export async function getClientBookingStatus(
  reference: string,
  rawToken: string
): Promise<ClientBookingStatusView | null> {
  if (!reference || !rawToken || rawToken.trim().length < 16) {
    return null;
  }

  return withServiceRole(async (tx) => {
    const booking = await findBookingByReference(tx, reference.trim());
    if (!booking) return null;

    if (booking.access_token_hash === "revoked") {
      return null;
    }

    // Tokens expire 90 days after last booking update per Threat Model section 7
    const updatedMs = new Date(booking.updated_at).getTime();
    if (!Number.isNaN(updatedMs) && Date.now() - updatedMs > 90 * 24 * 60 * 60 * 1000) {
      return null;
    }

    const tokenHash = hashAccessToken(rawToken);
    if (!safeCompare(tokenHash, booking.access_token_hash)) {
      return null;
    }

    const [events, quotes, payments, settings] = await Promise.all([
      findBookingEvents(tx, booking.id, true),
      findQuotesByBookingId(tx, booking.id),
      findPaymentsByBookingId(tx, booking.id),
      findSiteSettings(tx),
    ]);

    const activeQuote =
      quotes.find((q) => q.id === booking.accepted_quote_id) ??
      quotes.find((q) => q.status === "sent") ??
      quotes.find((q) => q.status === "accepted" || q.status === "expired") ??
      null;

    return {
      booking: {
        id: booking.id,
        reference: booking.reference,
        status: booking.status,
        headline: CLIENT_STATUS_HEADLINES[booking.status],
        kind: booking.kind,
        service_name: booking.service_name ?? booking.kind,
        package_name: booking.package_name ?? null,
        occasion_name: booking.occasion_name ?? booking.occasion_other,
        client_name: booking.client_name,
        event_date: booking.event_date,
        time_of_day: booking.time_of_day,
        venue_text: booking.venue_text,
        venue_city: booking.venue_city,
        deadline: booking.deadline,
        starts_at: booking.starts_at,
        ends_at: booking.ends_at,
        cancelled_reason: booking.cancelled_reason,
        gallery_url: booking.gallery_url ?? null,
        gallery_pin: booking.gallery_pin ?? null,
        gallery_notes: booking.gallery_notes ?? null,
        gallery_expires_at: booking.gallery_expires_at ?? null,
        created_at: booking.created_at,
      },
      events,
      activeQuote,
      payments: payments.map((p) => ({
        id: p.id,
        method: p.method,
        amount_minor: p.amount_minor,
        is_refund: p.is_refund,
        currency: p.currency,
        received_at: p.received_at,
        provider_reference: p.provider_reference,
      })),
      settings: {
        business_name: settings.business_name,
        whatsapp_e164: settings.whatsapp_e164,
        phone_e164: settings.phone_e164,
        contact_email: settings.contact_email,
        social: settings.social,
      },
    };
  });
}

export async function cancelBookingByClient(
  reference: string,
  rawToken: string,
  rawBody: unknown
): Promise<{ status: BookingStatus }> {
  const parsed = clientCancelSchema.safeParse(rawBody ?? {});
  if (!parsed.success) {
    throw new ProblemError(422, "validation_error", "Invalid cancellation reason", "Keep reason under 500 characters.");
  }
  const reason = parsed.data.reason?.trim() || "Cancelled by client from status page.";
  const tokenHash = hashAccessToken(rawToken);

  await withServiceRole(async (tx) => {
    const booking = await findBookingByReference(tx, reference.trim());
    if (!booking || !safeCompare(tokenHash, booking.access_token_hash)) {
      throw new ProblemError(404, "not_found", "Booking not found", "Invalid or expired status link.");
    }
    if (!canTransitionBooking(booking.status, "cancelled") || booking.status === "cancelled") {
      throw new ProblemError(
        409,
        "invalid_state",
        "Cannot cancel in current state",
        `This booking is already ${booking.status}.`
      );
    }

    await tx.query(
      `update bookings set status = 'cancelled', cancelled_reason = $2 where id = $1::uuid`,
      [booking.id, reason]
    );
    await tx.query(
      `insert into booking_events (booking_id, actor_type, event_type, from_status, to_status, note, visible_to_client)
       values ($1::uuid, 'client', 'booking_cancelled', $2::booking_status, 'cancelled', $3, true)`,
      [booking.id, booking.status, reason]
    );

    const settings = await findSiteSettings(tx);
    await enqueueOutboxEmail(tx, {
      dedupeKey: `admin-cancelled:${booking.id}:${Date.now()}`,
      toEmail: settings.contact_email,
      template: "admin_cancelled",
      payload: {
        booking_id: booking.id,
        reference: booking.reference,
        client_name: booking.client_name,
        reason,
      },
    });
    await enqueueOutboxEmail(tx, {
      dedupeKey: `client-cancelled:${booking.id}:${Date.now()}`,
      toEmail: booking.client_email,
      template: "cancellation_received",
      payload: {
        booking_id: booking.id,
        reference: booking.reference,
        client_name: booking.client_name,
        reason,
      },
    });
  });

  await processEmailOutbox().catch(() => undefined);
  invalidateCache("booking");
  try {
    revalidatePath("/book");
  } catch {
    // ignore
  }
  return { status: "cancelled" };
}

export async function listBookingsForAdmin(
  admin: AdminSessionPayload,
  filters: {
    status?: BookingStatus;
    kind?: ServiceKind;
    from?: string;
    to?: string;
    q?: string;
    cursor?: string;
    limit?: number;
  }
) {
  return withAdminRole(admin.adminId, admin.aal, (tx) => findAdminBookings(tx, filters));
}

export async function getBookingDetailForAdmin(admin: AdminSessionPayload, bookingId: string) {
  return withAdminRole(admin.adminId, admin.aal, async (tx) => {
    const booking = await findBookingById(tx, bookingId);
    if (!booking) {
      throw new ProblemError(404, "not_found", "Booking not found", "No booking matches that ID.");
    }

    // Automatically transition new -> reviewing when first opened by an admin (App Flow 4.1)
    if (booking.status === "new") {
      await tx.query(`update bookings set status = 'reviewing' where id = $1::uuid`, [booking.id]);
      await tx.query(
        `insert into booking_events (booking_id, actor_type, actor_id, event_type, from_status, to_status, note, visible_to_client)
         values ($1::uuid, 'admin', $2::uuid, 'request_opened', 'new', 'reviewing', 'Request opened for review', true)`,
        [booking.id, admin.adminId]
      );
      booking.status = "reviewing";
    }

    const [events, quotes, payments] = await Promise.all([
      findBookingEvents(tx, booking.id, false),
      findQuotesByBookingId(tx, booking.id),
      findPaymentsByBookingId(tx, booking.id),
    ]);

    return { booking, events, quotes, payments };
  });
}

export async function transitionBookingByAdmin(
  admin: AdminSessionPayload,
  bookingId: string,
  rawInput: unknown
): Promise<BookingRecord> {
  const parsed = bookingTransitionSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ProblemError(422, "validation_error", "Invalid transition request", "Check transition parameters.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }
  const v = parsed.data;

  let outboxToQueue: {
    dedupeKey: string;
    toEmail: string;
    template: string;
    payload: Record<string, unknown>;
  } | null = null;

  const updated = await withAdminRole(admin.adminId, admin.aal, async (tx) => {
    const booking = await findBookingById(tx, bookingId);
    if (!booking) {
      throw new ProblemError(404, "not_found", "Booking not found", "No booking matches that ID.");
    }

    if (!canTransitionBooking(booking.status, v.to) || booking.status === v.to) {
      throw new ProblemError(
        409,
        "illegal_transition",
        "Action not allowed in current status",
        `Cannot move booking from ${booking.status} to ${v.to}.`
      );
    }

    if (v.to === "confirmed") {
      if (!booking.accepted_quote_id) {
        throw new ProblemError(
          409,
          "quote_not_accepted",
          "Quote must be accepted first",
          "The client must accept a quote before the booking can be confirmed."
        );
      }
      const quotes = await findQuotesByBookingId(tx, booking.id);
      const acceptedQuote = quotes.find((q) => q.id === booking.accepted_quote_id);
      const payments = await findPaymentsByBookingId(tx, booking.id);
      const netPaid = payments.reduce(
        (sum, p) => sum + (p.is_refund ? -p.amount_minor : p.amount_minor),
        0
      );
      const requiredDeposit = acceptedQuote?.deposit_minor ?? 0;
      if (payments.length === 0 || netPaid < requiredDeposit) {
        throw new ProblemError(
          409,
          "deposit_required",
          "Deposit not recorded",
          "Record the deposit payment before confirming the booking."
        );
      }

      const startsAt = v.startsAt ?? booking.starts_at;
      const endsAt = v.endsAt ?? booking.ends_at;
      if (booking.kind !== "design" && (!startsAt || !endsAt)) {
        throw new ProblemError(
          422,
          "window_required",
          "Shoot window required",
          "Set the shoot start and end times before confirming."
        );
      }

      try {
        await tx.query(
          `update bookings
              set status = 'confirmed',
                  starts_at = coalesce($2::timestamptz, starts_at),
                  ends_at = coalesce($3::timestamptz, ends_at)
            where id = $1::uuid`,
          [booking.id, startsAt ?? null, endsAt ?? null]
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("bookings_no_crew_overlap") || msg.includes("exclusion")) {
          const conflictRes = await tx.query<{ reference: string; starts_at: string; ends_at: string }>(
            `select reference, starts_at::text as starts_at, ends_at::text as ends_at
               from bookings
              where status = 'confirmed'
                and kind <> 'design'
                and id <> $1::uuid
                and tstzrange(starts_at, ends_at, '[)') && tstzrange($2::timestamptz, $3::timestamptz, '[)')
              limit 1`,
            [booking.id, startsAt, endsAt]
          );
          const conflict = conflictRes.rows[0];
          const conflictDetail = conflict
            ? `Another confirmed booking (${conflict.reference}) runs from ${conflict.starts_at} to ${conflict.ends_at}.`
            : "Another confirmed job overlaps that time window.";
          throw new ProblemError(
            409,
            "window_conflict",
            "Crew schedule overlap",
            conflictDetail
          );
        }
        throw err;
      }

      await tx.query(
        `insert into booking_events (booking_id, actor_type, actor_id, event_type, from_status, to_status, note, visible_to_client)
         values ($1::uuid, 'admin', $2::uuid, 'booking_confirmed', $3::booking_status, 'confirmed', $4, true)`,
        [booking.id, admin.adminId, booking.status, v.note ?? "Booking confirmed with deposit recorded."]
      );

      outboxToQueue = {
        dedupeKey: `booking-confirmed:${booking.id}`,
        toEmail: booking.client_email,
        template: "booking_confirmed",
        payload: {
          booking_id: booking.id,
          reference: booking.reference,
          client_name: booking.client_name,
          starts_at: startsAt,
          ends_at: endsAt,
          event_date: booking.event_date,
          deadline: booking.deadline,
          venue_text: booking.venue_text,
          venue_city: booking.venue_city,
        },
      };
    } else if (v.to === "completed") {
      const targetDate = booking.event_date ?? booking.deadline;
      const today = getAccraTodayIso();
      if (targetDate && targetDate > today) {
        throw new ProblemError(
          409,
          "event_in_future",
          "Event date has not passed yet",
          "A booking can be marked completed once its event or deadline date has passed."
        );
      }
      await tx.query(`update bookings set status = 'completed' where id = $1::uuid`, [booking.id]);
      await tx.query(
        `insert into booking_events (booking_id, actor_type, actor_id, event_type, from_status, to_status, note, visible_to_client)
         values ($1::uuid, 'admin', $2::uuid, 'booking_completed', $3::booking_status, 'completed', $4, true)`,
        [booking.id, admin.adminId, booking.status, v.note ?? "Deliverables completed."]
      );
    } else if (v.to === "declined" || v.to === "cancelled") {
      if (!v.note || v.note.trim().length < 3) {
        throw new ProblemError(
          422,
          "reason_required",
          "Provide a short reason",
          "Declining or cancelling requires a clear note for the record."
        );
      }
      await tx.query(
        `update bookings set status = $2::booking_status, cancelled_reason = $3 where id = $1::uuid`,
        [booking.id, v.to, v.note.trim()]
      );
      await tx.query(
        `insert into booking_events (booking_id, actor_type, actor_id, event_type, from_status, to_status, note, visible_to_client)
         values ($1::uuid, 'admin', $2::uuid, $3, $4::booking_status, $5::booking_status, $6, true)`,
        [
          booking.id,
          admin.adminId,
          v.to === "declined" ? "request_declined" : "booking_cancelled",
          booking.status,
          v.to,
          v.note.trim(),
        ]
      );

      outboxToQueue = {
        dedupeKey: `admin-status-${v.to}:${booking.id}:${Date.now()}`,
        toEmail: booking.client_email,
        template: v.to === "declined" ? "request_declined" : "booking_cancelled",
        payload: {
          booking_id: booking.id,
          reference: booking.reference,
          client_name: booking.client_name,
          reason: v.note.trim(),
        },
      };
    } else {
      await tx.query(`update bookings set status = $2::booking_status where id = $1::uuid`, [
        booking.id,
        v.to,
      ]);
      await tx.query(
        `insert into booking_events (booking_id, actor_type, actor_id, event_type, from_status, to_status, note, visible_to_client)
         values ($1::uuid, 'admin', $2::uuid, 'status_changed', $3::booking_status, $4::booking_status, $5, true)`,
        [booking.id, admin.adminId, booking.status, v.to, v.note ?? null]
      );
    }

    return (await findBookingById(tx, booking.id))!;
  });

  if (outboxToQueue) {
    const emailRow = outboxToQueue;
    await withServiceRole((svcTx) => enqueueOutboxEmail(svcTx, emailRow));
  }

  await processEmailOutbox().catch(() => undefined);
  invalidateCache("booking");
  try {
    revalidatePath("/book");
  } catch {
    // ignore
  }
  return updated;
}

export async function rotateBookingTokenByAdmin(
  admin: AdminSessionPayload,
  bookingId: string
): Promise<{ statusUrl: string }> {
  const env = getServerEnv();
  const rawToken = generateAccessToken();
  const tokenHash = hashAccessToken(rawToken);

  const info = await withAdminRole(admin.adminId, admin.aal, async (tx) => {
    const booking = await findBookingById(tx, bookingId);
    if (!booking) {
      throw new ProblemError(404, "not_found", "Booking not found", "No booking matches that ID.");
    }
    await tx.query(`update bookings set access_token_hash = $2 where id = $1::uuid`, [
      booking.id,
      tokenHash,
    ]);
    await tx.query(
      `insert into booking_events (booking_id, actor_type, actor_id, event_type, note, visible_to_client)
       values ($1::uuid, 'admin', $2::uuid, 'token_rotated', 'Issued a fresh private status link', false)`,
      [booking.id, admin.adminId]
    );
    return booking;
  });

  const statusUrl = `${env.NEXT_PUBLIC_SITE_URL}/booking/status/${encodeURIComponent(info.reference)}?t=${encodeURIComponent(rawToken)}`;

  await withServiceRole((svcTx) =>
    enqueueOutboxEmail(svcTx, {
      dedupeKey: `token-rotated:${info.id}:${Date.now()}`,
      toEmail: info.client_email,
      template: "new_status_link",
      payload: {
        booking_id: info.id,
        reference: info.reference,
        client_name: info.client_name,
        status_url: statusUrl,
      },
    })
  );
  await processEmailOutbox().catch(() => undefined);

  return { statusUrl };
}

export async function getCalendarAndBlockedDatesAdmin(
  admin: AdminSessionPayload,
  fromDate: string,
  toDate: string
) {
  return withAdminRole(admin.adminId, admin.aal, async (tx) => {
    const [bookings, blocked] = await Promise.all([
      findCalendarBookingsAdmin(tx, fromDate, toDate),
      findBlockedDatesAdmin(tx),
    ]);
    return { bookings, blocked };
  });
}

export async function addBlockedDateAdmin(
  admin: AdminSessionPayload,
  rawInput: unknown
): Promise<BlockedDateRange> {
  const parsed = blockedDateCreateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ProblemError(422, "validation_error", "Check date range", "Invalid blocked date range.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }
  const v = parsed.data;
  const exclusiveEnd = addDaysIso(v.toDateInclusive, 1);

  const row = await withAdminRole(admin.adminId, admin.aal, async (tx) => {
    const res = await tx.query<BlockedDateRange>(
      `insert into blocked_dates (during, reason, created_by)
       values (daterange($1::date, $2::date, '[)'), $3, $4::uuid)
       returning id, lower(during)::text as from_date, (upper(during) - 1)::text as to_date_inclusive, reason, created_by, created_at::text as created_at`,
      [v.fromDate, exclusiveEnd, v.reason, admin.adminId]
    );
    return res.rows[0]!;
  });

  invalidateCache("booking");
  try {
    revalidatePath("/book");
  } catch {
    // ignore
  }
  return row;
}

export async function removeBlockedDateAdmin(
  admin: AdminSessionPayload,
  blockedId: string
): Promise<void> {
  await withAdminRole(admin.adminId, admin.aal, async (tx) => {
    await tx.query(`delete from blocked_dates where id = $1::uuid`, [blockedId]);
  });
  invalidateCache("booking");
  try {
    revalidatePath("/book");
  } catch {
    // ignore
  }
}

export async function saveBookingGalleryDelivery(
  admin: AdminSessionPayload,
  bookingId: string,
  rawInput: unknown
): Promise<BookingRecord> {
  const parsed = galleryDeliverySchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ProblemError(422, "validation_error", "Invalid gallery delivery parameters", "Check form values.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }
  const v = parsed.data;

  return withAdminRole(admin.adminId, admin.aal, async (tx) => {
    const booking = await findBookingById(tx, bookingId);
    if (!booking) {
      throw new ProblemError(404, "not_found", "Booking not found", "No booking matches that ID.");
    }

    const nextStatus = v.markCompleted && booking.status === "confirmed" ? "completed" : undefined;

    const updated = await updateBookingGalleryDelivery(tx, booking.id, {
      galleryUrl: v.galleryUrl ?? null,
      galleryPin: v.galleryPin ?? null,
      galleryNotes: v.galleryNotes ?? null,
      galleryExpiresAt: v.galleryExpiresAt ?? null,
      status: nextStatus,
    });

    if (!updated) {
      throw new ProblemError(500, "database_error", "Failed to update gallery delivery", "Please try again.");
    }

    const eventNote = v.galleryUrl
      ? `Deliverables uploaded to studio gallery${v.galleryPin ? " (PIN protected)" : ""}.`
      : "Studio gallery delivery details updated.";

    await tx.query(
      `insert into booking_events (booking_id, actor_type, actor_id, event_type, from_status, to_status, note, visible_to_client)
       values ($1::uuid, 'admin', $2::uuid, 'gallery_delivered', $3::booking_status, $4::booking_status, $5, true)`,
      [booking.id, admin.adminId, booking.status, updated.status, eventNote]
    );

    return updated;
  });
}

