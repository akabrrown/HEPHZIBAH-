import type { AdminSessionPayload } from "@/lib/auth";
import { withAdminRole, withServiceRole } from "@/lib/db";
import { ProblemError } from "@/lib/errors";
import { hashAccessToken, safeCompare } from "@/lib/tokens";
import { findBookingById, findBookingByReference } from "@/modules/booking/repository";
import { findSiteSettings } from "@/modules/catalog/repository";
import { enqueueOutboxEmail } from "@/modules/notify/repository";
import { processEmailOutbox } from "@/modules/notify/service";
import { findQuotesByBookingId } from "./repository";
import {
  acceptQuoteBodySchema,
  paymentCreateSchema,
  quoteDraftUpsertSchema,
  type PaymentRecord,
  type QuoteRecord,
} from "./schema";

export async function upsertDraftQuoteAdmin(
  admin: AdminSessionPayload,
  bookingId: string,
  rawInput: unknown
): Promise<QuoteRecord> {
  const parsed = quoteDraftUpsertSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ProblemError(422, "validation_error", "Check quote fields", "Invalid quote items or deposit.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }
  const v = parsed.data;

  const computedTotal = v.items.reduce(
    (sum, item) => sum + Math.round(item.quantity * item.unit_price_minor),
    0
  );

  return withAdminRole(admin.adminId, admin.aal, async (tx) => {
    const booking = await findBookingById(tx, bookingId);
    if (!booking) {
      throw new ProblemError(404, "not_found", "Booking not found", "No booking matches that ID.");
    }
    if (!["new", "reviewing", "expired"].includes(booking.status)) {
      throw new ProblemError(
        409,
        "invalid_state",
        "Cannot edit draft in current booking state",
        `Revise the sent quote instead of editing while status is ${booking.status}.`
      );
    }
    if (booking.status === "new" || booking.status === "expired") {
      await tx.query(`update bookings set status = 'reviewing' where id = $1::uuid`, [booking.id]);
    }

    if (v.starts_at && v.ends_at) {
      await tx.query(
        `update bookings set starts_at = $2::timestamptz, ends_at = $3::timestamptz where id = $1::uuid`,
        [booking.id, v.starts_at, v.ends_at]
      );
    }

    const existingQuotes = await findQuotesByBookingId(tx, booking.id);
    const targetDraft = v.quote_id
      ? existingQuotes.find((q) => q.id === v.quote_id)
      : existingQuotes.find((q) => q.status === "draft");

    let quoteId: string;
    if (targetDraft) {
      if (targetDraft.status !== "draft") {
        throw new ProblemError(
          409,
          "quote_frozen",
          "Sent quote cannot be modified",
          "Create a revised quote version instead."
        );
      }
      await tx.query(
        `update quotes
            set total_minor = $2,
                deposit_minor = $3,
                notes = $4
          where id = $1::uuid`,
        [targetDraft.id, computedTotal, v.deposit_minor, v.notes ?? null]
      );
      await tx.query(`delete from quote_items where quote_id = $1::uuid`, [targetDraft.id]);
      quoteId = targetDraft.id;
    } else {
      const nextVersion = existingQuotes.length > 0 ? Math.max(...existingQuotes.map((q) => q.version)) + 1 : 1;
      const inserted = await tx.query<{ id: string }>(
        `insert into quotes (booking_id, version, status, total_minor, deposit_minor, notes, created_by)
         values ($1::uuid, $2, 'draft', $3, $4, $5, $6::uuid)
         returning id`,
        [booking.id, nextVersion, computedTotal, v.deposit_minor, v.notes ?? null, admin.adminId]
      );
      quoteId = inserted.rows[0]!.id;
    }

    for (let i = 0; i < v.items.length; i++) {
      const item = v.items[i]!;
      await tx.query(
        `insert into quote_items (quote_id, position, description, quantity, unit_price_minor)
         values ($1::uuid, $2, $3, $4, $5)`,
        [quoteId, i, item.description, item.quantity, item.unit_price_minor]
      );
    }

    const refreshed = await findQuotesByBookingId(tx, booking.id);
    return refreshed.find((q) => q.id === quoteId)!;
  });
}

export async function sendQuoteAdmin(
  admin: AdminSessionPayload,
  bookingId: string,
  quoteId: string,
  validDaysOverride?: number
): Promise<QuoteRecord> {
  let outboxEmail: {
    dedupeKey: string;
    toEmail: string;
    template: string;
    payload: Record<string, unknown>;
  } | null = null;

  const sentQuote = await withAdminRole(admin.adminId, admin.aal, async (tx) => {
    const booking = await findBookingById(tx, bookingId);
    if (!booking) {
      throw new ProblemError(404, "not_found", "Booking not found", "No booking matches that ID.");
    }
    const quotes = await findQuotesByBookingId(tx, booking.id);
    const quote = quotes.find((q) => q.id === quoteId);
    if (!quote) {
      throw new ProblemError(404, "not_found", "Quote not found", "No quote matches that ID.");
    }
    if (quote.status !== "draft") {
      throw new ProblemError(409, "invalid_state", "Quote already sent", "Only draft quotes can be sent.");
    }
    if (quote.items.length === 0) {
      throw new ProblemError(422, "empty_quote", "Add quote items first", "A quote must contain at least one line item.");
    }

    const settings = await findSiteSettings(tx);
    const validityDays = validDaysOverride && validDaysOverride > 0 ? validDaysOverride : settings.quote_validity_days;
    const validUntil = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString();

    if (booking.status === "new") {
      await tx.query(`update bookings set status = 'reviewing' where id = $1::uuid`, [booking.id]);
    }

    await tx.query(
      `update quotes set status = 'superseded' where booking_id = $1::uuid and status = 'sent' and id <> $2::uuid`,
      [booking.id, quote.id]
    );

    await tx.query(
      `update quotes
          set status = 'sent',
              sent_at = now(),
              valid_until = $2::timestamptz
        where id = $1::uuid`,
      [quote.id, validUntil]
    );

    await tx.query(`update bookings set status = 'quoted' where id = $1::uuid`, [booking.id]);
    await tx.query(
      `insert into booking_events (booking_id, actor_type, actor_id, event_type, from_status, to_status, note, visible_to_client)
       values ($1::uuid, 'admin', $2::uuid, 'quote_sent', $3::booking_status, 'quoted', $4, true)`,
      [
        booking.id,
        admin.adminId,
        booking.status === "new" ? "reviewing" : booking.status,
        `Quote v${quote.version} sent`,
      ]
    );

    outboxEmail = {
      dedupeKey: `quote-sent:${quote.id}`,
      toEmail: booking.client_email,
      template: "quote_sent",
      payload: {
        booking_id: booking.id,
        reference: booking.reference,
        client_name: booking.client_name,
        total_minor: quote.total_minor,
        deposit_minor: quote.deposit_minor,
        valid_until: validUntil,
      },
    };

    const updated = await findQuotesByBookingId(tx, booking.id);
    return updated.find((q) => q.id === quote.id)!;
  });

  if (outboxEmail) {
    const emailRow = outboxEmail;
    await withServiceRole((svcTx) => enqueueOutboxEmail(svcTx, emailRow));
  }

  await processEmailOutbox().catch(() => undefined);
  return sentQuote;
}

export async function reviseQuoteAdmin(
  admin: AdminSessionPayload,
  bookingId: string,
  quoteId: string
): Promise<QuoteRecord> {
  return withAdminRole(admin.adminId, admin.aal, async (tx) => {
    const booking = await findBookingById(tx, bookingId);
    if (!booking) {
      throw new ProblemError(404, "not_found", "Booking not found", "No booking matches that ID.");
    }
    const quotes = await findQuotesByBookingId(tx, booking.id);
    const oldQuote = quotes.find((q) => q.id === quoteId);
    if (!oldQuote) {
      throw new ProblemError(404, "not_found", "Quote not found", "No quote matches that ID.");
    }
    if (oldQuote.status !== "sent" && oldQuote.status !== "expired") {
      throw new ProblemError(409, "invalid_state", "Quote cannot be revised", "Only sent or expired quotes can be revised.");
    }

    if (oldQuote.status === "sent") {
      await tx.query(`update quotes set status = 'superseded' where id = $1::uuid`, [oldQuote.id]);
    }
    if (booking.status === "quoted" || booking.status === "expired") {
      await tx.query(`update bookings set status = 'reviewing' where id = $1::uuid`, [booking.id]);
      await tx.query(
        `insert into booking_events (booking_id, actor_type, actor_id, event_type, from_status, to_status, note, visible_to_client)
         values ($1::uuid, 'admin', $2::uuid, 'quote_revised', $3::booking_status, 'reviewing', $4, true)`,
        [booking.id, admin.adminId, booking.status, `Revising quote v${oldQuote.version}`]
      );
    }

    const nextVersion = Math.max(...quotes.map((q) => q.version)) + 1;
    const inserted = await tx.query<{ id: string }>(
      `insert into quotes (booking_id, version, status, total_minor, deposit_minor, notes, created_by)
       values ($1::uuid, $2, 'draft', $3, $4, $5, $6::uuid)
       returning id`,
      [
        booking.id,
        nextVersion,
        oldQuote.total_minor,
        oldQuote.deposit_minor,
        oldQuote.notes,
        admin.adminId,
      ]
    );
    const newQuoteId = inserted.rows[0]!.id;

    for (const item of oldQuote.items) {
      await tx.query(
        `insert into quote_items (quote_id, position, description, quantity, unit_price_minor)
         values ($1::uuid, $2, $3, $4, $5)`,
        [newQuoteId, item.position, item.description, item.quantity, item.unit_price_minor]
      );
    }

    const refreshed = await findQuotesByBookingId(tx, booking.id);
    return refreshed.find((q) => q.id === newQuoteId)!;
  });
}

export async function acceptQuoteByClient(
  reference: string,
  rawToken: string,
  rawBody: unknown
): Promise<{ status: "accepted" }> {
  const parsed = acceptQuoteBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ProblemError(422, "validation_error", "Invalid quote selection", "Provide a valid quote ID.");
  }

  const tokenHash = hashAccessToken(rawToken);
  const quoteId = parsed.data.quoteId;

  await withServiceRole(async (tx) => {
    const booking = await findBookingByReference(tx, reference.trim());
    if (!booking || !safeCompare(tokenHash, booking.access_token_hash)) {
      throw new ProblemError(404, "not_found", "Booking not found", "Invalid or expired status link.");
    }

    try {
      await tx.query(`select accept_quote($1, $2, $3::uuid)`, [
        booking.reference,
        tokenHash,
        quoteId,
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("not_found")) {
        throw new ProblemError(404, "not_found", "Booking not found", "Invalid or expired status link.");
      }
      if (msg.includes("quote_unavailable")) {
        throw new ProblemError(
          409,
          "quote_unavailable",
          "This quote has expired",
          "This quote has expired or been replaced. Reply here or on WhatsApp and we will refresh it."
        );
      }
      if (msg.includes("invalid_state")) {
        throw new ProblemError(
          409,
          "invalid_state",
          "Quote already handled",
          "This booking is no longer awaiting quote acceptance."
        );
      }
      throw err;
    }

    const quotes = await findQuotesByBookingId(tx, booking.id);
    const accepted = quotes.find((q) => q.id === quoteId);

    await enqueueOutboxEmail(tx, {
      dedupeKey: `deposit-instructions:${quoteId}`,
      toEmail: booking.client_email,
      template: "deposit_instructions",
      payload: {
        booking_id: booking.id,
        reference: booking.reference,
        client_name: booking.client_name,
        deposit_minor: accepted?.deposit_minor ?? 0,
      },
    });
    await tx.query(
      `update email_outbox
          set payload = payload || $2::jsonb
        where dedupe_key = 'admin-quote-accepted:' || $1`,
      [
        quoteId,
        JSON.stringify({
          reference: booking.reference,
          client_name: booking.client_name,
        }),
      ]
    );
  });

  await processEmailOutbox().catch(() => undefined);
  return { status: "accepted" };
}

export async function recordPaymentAdmin(
  admin: AdminSessionPayload,
  bookingId: string,
  rawInput: unknown
): Promise<PaymentRecord> {
  const parsed = paymentCreateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ProblemError(422, "validation_error", "Check payment details", "Invalid payment input.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }
  const v = parsed.data;

  return withAdminRole(admin.adminId, admin.aal, async (tx) => {
    const booking = await findBookingById(tx, bookingId);
    if (!booking) {
      throw new ProblemError(404, "not_found", "Booking not found", "No booking matches that ID.");
    }

    const res = await tx.query<PaymentRecord>(
      `insert into payments (
         booking_id, provider, method, amount_minor, is_refund,
         provider_reference, received_at, note, recorded_by
       ) values ($1::uuid, 'manual', $2::payment_method, $3, $4, $5, $6::timestamptz, $7, $8::uuid)
       returning id, booking_id, provider, method, amount_minor, is_refund, currency,
                 provider_reference, received_at::text as received_at, note, recorded_by, created_at::text as created_at`,
      [
        booking.id,
        v.method,
        v.amount_minor,
        v.is_refund,
        v.provider_reference ?? null,
        v.received_at,
        v.note ?? null,
        admin.adminId,
      ]
    );
    const payment = res.rows[0]!;

    await tx.query(
      `insert into booking_events (booking_id, actor_type, actor_id, event_type, note, visible_to_client)
       values ($1::uuid, 'admin', $2::uuid, $3, $4, true)`,
      [
        booking.id,
        admin.adminId,
        v.is_refund ? "refund_recorded" : "payment_recorded",
        `${v.is_refund ? "Refund" : "Payment"} recorded (${v.method.toUpperCase()} · ${v.amount_minor / 100} GHS)${v.provider_reference ? ` · Ref ${v.provider_reference}` : ""}`,
      ]
    );

    return payment;
  });
}

export async function expireDueQuotes(): Promise<number> {
  const count = await withServiceRole(async (tx) => {
    const dueQuotes = await tx.query<{
      quote_id: string;
      booking_id: string;
      reference: string;
      client_email: string;
      client_name: string;
    }>(
      `select q.id as quote_id, b.id as booking_id, b.reference,
              b.client_email::text as client_email, b.client_name
         from quotes q
         join bookings b on b.id = q.booking_id
        where q.status = 'sent'
          and q.valid_until is not null
          and q.valid_until <= now()`
    );

    for (const row of dueQuotes.rows) {
      await tx.query(`update quotes set status = 'expired' where id = $1::uuid`, [row.quote_id]);
      await tx.query(
        `update bookings set status = 'expired' where id = $1::uuid and status = 'quoted'`,
        [row.booking_id]
      );
      await tx.query(
        `insert into booking_events (booking_id, actor_type, event_type, from_status, to_status, note, visible_to_client)
         values ($1::uuid, 'system', 'quote_expired', 'quoted', 'expired', 'Quote validity period ended', true)`,
        [row.booking_id]
      );
      await enqueueOutboxEmail(tx, {
        dedupeKey: `quote-expired:${row.quote_id}`,
        toEmail: row.client_email,
        template: "quote_expired",
        payload: {
          booking_id: row.booking_id,
          reference: row.reference,
          client_name: row.client_name,
        },
      });
    }

    return dueQuotes.rows.length;
  });

  if (count > 0) {
    await processEmailOutbox().catch(() => undefined);
  }
  return count;
}
