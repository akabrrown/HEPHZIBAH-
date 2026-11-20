import type { DbTx } from "@/lib/db";
import type { ServiceKind } from "@/modules/catalog/schema";
import type {
  BlockedDateRange,
  BookingEventRecord,
  BookingRecord,
  BookingStatus,
} from "./schema";

export async function findUnavailableDatesInRange(
  tx: DbTx,
  fromDate: string,
  toDate: string
): Promise<string[]> {
  const res = await tx.query<{ day: string }>(
    `select day::text as day
       from public_unavailable_dates
      where day >= $1::date and day <= $2::date
      order by day asc`,
    [fromDate, toDate]
  );
  return res.rows.map((r) => r.day.slice(0, 10));
}

export async function findBookingByReference(
  tx: DbTx,
  reference: string
): Promise<BookingRecord | null> {
  const res = await tx.query<BookingRecord>(
    `select b.id, b.reference, b.idempotency_key, b.access_token_hash, b.status, b.kind,
            b.service_id, s.name as service_name, b.package_id, p.name as package_name,
            b.occasion_id, o.name as occasion_name, b.occasion_other,
            b.client_name, b.client_email::text as client_email, b.client_phone,
            b.preferred_contact, b.event_date::text as event_date, b.time_of_day,
            b.venue_text, b.venue_city, b.guest_count, b.deadline::text as deadline,
            b.brief, b.budget_band, b.reference_links, b.source,
            b.starts_at::text as starts_at, b.ends_at::text as ends_at,
            b.accepted_quote_id, b.cancelled_reason,
            b.gallery_url, b.gallery_pin, b.gallery_notes, b.gallery_expires_at::text as gallery_expires_at,
            b.privacy_version, b.terms_version, b.consented_at::text as consented_at,
            b.created_at::text as created_at, b.updated_at::text as updated_at
       from bookings b
       join services s on s.id = b.service_id
       left join packages p on p.id = b.package_id
       left join occasions o on o.id = b.occasion_id
      where b.reference = $1`,
    [reference]
  );
  return res.rows[0] ?? null;
}

export async function findBookingById(
  tx: DbTx,
  id: string
): Promise<BookingRecord | null> {
  const res = await tx.query<BookingRecord>(
    `select b.id, b.reference, b.idempotency_key, b.access_token_hash, b.status, b.kind,
            b.service_id, s.name as service_name, b.package_id, p.name as package_name,
            b.occasion_id, o.name as occasion_name, b.occasion_other,
            b.client_name, b.client_email::text as client_email, b.client_phone,
            b.preferred_contact, b.event_date::text as event_date, b.time_of_day,
            b.venue_text, b.venue_city, b.guest_count, b.deadline::text as deadline,
            b.brief, b.budget_band, b.reference_links, b.source,
            b.starts_at::text as starts_at, b.ends_at::text as ends_at,
            b.accepted_quote_id, b.cancelled_reason,
            b.gallery_url, b.gallery_pin, b.gallery_notes, b.gallery_expires_at::text as gallery_expires_at,
            b.privacy_version, b.terms_version, b.consented_at::text as consented_at,
            b.created_at::text as created_at, b.updated_at::text as updated_at
       from bookings b
       join services s on s.id = b.service_id
       left join packages p on p.id = b.package_id
       left join occasions o on o.id = b.occasion_id
      where b.id = $1::uuid`,
    [id]
  );
  return res.rows[0] ?? null;
}

export async function findBookingEvents(
  tx: DbTx,
  bookingId: string,
  clientVisibleOnly = false
): Promise<BookingEventRecord[]> {
  const res = await tx.query<BookingEventRecord>(
    `select e.id::int as id, e.booking_id, e.actor_type, e.actor_id, a.display_name as actor_name,
            e.event_type, e.from_status, e.to_status, e.note, e.visible_to_client,
            e.created_at::text as created_at
       from booking_events e
       left join admin_users a on a.id = e.actor_id
      where e.booking_id = $1::uuid
        ${clientVisibleOnly ? "and e.visible_to_client = true" : ""}
      order by e.created_at asc, e.id asc`,
    [bookingId]
  );
  return res.rows;
}

export async function findAdminBookings(
  tx: DbTx,
  filters: {
    status?: BookingStatus;
    kind?: ServiceKind;
    from?: string;
    to?: string;
    q?: string;
    cursor?: string;
    limit?: number;
  }
): Promise<{ items: BookingRecord[]; nextCursor: string | null }> {
  const clauses: string[] = ["1=1"];
  const params: unknown[] = [];

  if (filters.status) {
    params.push(filters.status);
    clauses.push(`b.status = $${params.length}::booking_status`);
  }
  if (filters.kind) {
    params.push(filters.kind);
    clauses.push(`b.kind = $${params.length}::service_kind`);
  }
  if (filters.from) {
    params.push(filters.from);
    clauses.push(`coalesce(b.event_date, b.deadline, b.created_at::date) >= $${params.length}::date`);
  }
  if (filters.to) {
    params.push(filters.to);
    clauses.push(`coalesce(b.event_date, b.deadline, b.created_at::date) <= $${params.length}::date`);
  }
  if (filters.q && filters.q.trim().length > 0) {
    const escaped = filters.q.trim().replace(/[\\%_]/g, "\\$&");
    const q = `%${escaped}%`;
    params.push(q);
    const idx = params.length;
    clauses.push(
      `(b.reference ilike $${idx} escape '\\' or b.client_name ilike $${idx} escape '\\' or b.client_email::text ilike $${idx} escape '\\' or regexp_replace(b.client_phone, '[^0-9]', '', 'g') ilike $${idx} escape '\\')`
    );
  }
  if (filters.cursor) {
    params.push(filters.cursor);
    clauses.push(`b.created_at < $${params.length}::timestamptz`);
  }

  const limit = Math.min(Math.max(filters.limit ?? 30, 1), 1000);
  params.push(limit + 1);

  const res = await tx.query<BookingRecord>(
    `select b.id, b.reference, b.idempotency_key, b.access_token_hash, b.status, b.kind,
            b.service_id, s.name as service_name, b.package_id, p.name as package_name,
            b.occasion_id, o.name as occasion_name, b.occasion_other,
            b.client_name, b.client_email::text as client_email, b.client_phone,
            b.preferred_contact, b.event_date::text as event_date, b.time_of_day,
            b.venue_text, b.venue_city, b.guest_count, b.deadline::text as deadline,
            b.brief, b.budget_band, b.reference_links, b.source,
            b.starts_at::text as starts_at, b.ends_at::text as ends_at,
            b.accepted_quote_id, b.cancelled_reason,
            b.gallery_url, b.gallery_pin, b.gallery_notes, b.gallery_expires_at::text as gallery_expires_at,
            b.privacy_version, b.terms_version, b.consented_at::text as consented_at,
            b.created_at::text as created_at, b.updated_at::text as updated_at
       from bookings b
       join services s on s.id = b.service_id
       left join packages p on p.id = b.package_id
       left join occasions o on o.id = b.occasion_id
      where ${clauses.join(" and ")}
      order by b.created_at desc
      limit $${params.length}`,
    params
  );

  const hasMore = res.rows.length > limit;
  const items = hasMore ? res.rows.slice(0, limit) : res.rows;
  const nextCursor = hasMore ? (items[items.length - 1]?.created_at ?? null) : null;
  return { items, nextCursor };
}

export async function findBlockedDatesAdmin(tx: DbTx): Promise<BlockedDateRange[]> {
  const res = await tx.query<BlockedDateRange>(
    `select id,
            lower(during)::text as from_date,
            (upper(during) - 1)::text as to_date_inclusive,
            reason,
            created_by,
            created_at::text as created_at
       from blocked_dates
      order by lower(during) asc`
  );
  return res.rows;
}

export async function findCalendarBookingsAdmin(
  tx: DbTx,
  fromDate: string,
  toDate: string
): Promise<BookingRecord[]> {
  const res = await tx.query<BookingRecord>(
    `select b.id, b.reference, b.status, b.kind, b.service_id, s.name as service_name,
            b.occasion_id, o.name as occasion_name, b.occasion_other,
            b.client_name, b.client_phone, b.event_date::text as event_date, b.time_of_day,
            b.venue_text, b.venue_city, b.deadline::text as deadline,
            b.starts_at::text as starts_at, b.ends_at::text as ends_at, b.created_at::text as created_at,
            b.updated_at::text as updated_at
       from bookings b
       join services s on s.id = b.service_id
       left join occasions o on o.id = b.occasion_id
      where b.status in ('quoted', 'accepted', 'confirmed')
        and (
          (b.event_date between $1::date and $2::date)
          or ((b.starts_at at time zone 'Africa/Accra')::date between $1::date and $2::date)
          or (b.deadline between $1::date and $2::date)
        )
      order by coalesce(b.starts_at::date, b.event_date, b.deadline) asc`,
    [fromDate, toDate]
  );
  return res.rows;
}

export async function updateBookingGalleryDelivery(
  tx: DbTx,
  id: string,
  delivery: {
    galleryUrl: string | null;
    galleryPin: string | null;
    galleryNotes: string | null;
    galleryExpiresAt: string | null;
    status?: BookingStatus;
  }
): Promise<BookingRecord | null> {
  const sets: string[] = [
    "gallery_url = $2",
    "gallery_pin = $3",
    "gallery_notes = $4",
    "gallery_expires_at = $5::timestamptz",
    "updated_at = now()",
  ];
  const params: unknown[] = [
    id,
    delivery.galleryUrl,
    delivery.galleryPin,
    delivery.galleryNotes,
    delivery.galleryExpiresAt,
  ];

  if (delivery.status) {
    params.push(delivery.status);
    sets.push(`status = $${params.length}::booking_status`);
  }

  await tx.query(
    `update bookings
        set ${sets.join(", ")}
      where id = $1::uuid`,
    params
  );

  return findBookingById(tx, id);
}
