import type { DbTx } from "@/lib/db";
import type { PaymentRecord, QuoteItemRecord, QuoteRecord } from "./schema";

export async function findQuotesByBookingId(
  tx: DbTx,
  bookingId: string
): Promise<QuoteRecord[]> {
  const qRes = await tx.query<Omit<QuoteRecord, "items">>(
    `select id, booking_id, version, status, currency, total_minor, deposit_minor,
            valid_until::text as valid_until, notes, sent_at::text as sent_at,
            accepted_at::text as accepted_at, created_by, created_at::text as created_at
       from quotes
      where booking_id = $1::uuid
      order by version desc`,
    [bookingId]
  );

  if (qRes.rows.length === 0) return [];

  const quoteIds = qRes.rows.map((q) => q.id);
  const itemsRes = await tx.query<QuoteItemRecord>(
    `select id, quote_id, position, description, quantity::float8 as quantity,
            unit_price_minor, line_total_minor
       from quote_items
      where quote_id = any($1::uuid[])
      order by position asc`,
    [quoteIds]
  );

  const itemsByQuote = new Map<string, QuoteItemRecord[]>();
  for (const item of itemsRes.rows) {
    const arr = itemsByQuote.get(item.quote_id) ?? [];
    arr.push(item);
    itemsByQuote.set(item.quote_id, arr);
  }

  return qRes.rows.map((q) => ({
    ...q,
    items: itemsByQuote.get(q.id) ?? [],
  }));
}

export async function findPaymentsByBookingId(
  tx: DbTx,
  bookingId: string
): Promise<PaymentRecord[]> {
  const res = await tx.query<PaymentRecord>(
    `select id, booking_id, provider, method, amount_minor, is_refund, currency,
            provider_reference, received_at::text as received_at, note, recorded_by,
            created_at::text as created_at
       from payments
      where booking_id = $1::uuid
      order by received_at asc, created_at asc`,
    [bookingId]
  );
  return res.rows;
}
