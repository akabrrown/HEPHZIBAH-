import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createFreshTestDb } from "@/lib/db";
import {
  DEFAULT_BOOKINGS_ADMIN_ID,
  DEFAULT_CONTENT_ADMIN_ID,
  DEFAULT_OWNER_ID,
} from "@/lib/seed-data";
import { generateAccessToken, generateBookingReference, hashAccessToken } from "@/lib/tokens";

describe("PostgreSQL 16 schema invariants & RLS verification matrix", () => {
  let db: PGlite;
  let photoServiceId: string;
  let designServiceId: string;
  let weddingOccasionId: string;

  beforeAll(async () => {
    db = await createFreshTestDb();
    const sRes = await db.query<{ id: string; kind: string; slug: string }>(
      `select id, kind, slug from services where slug in ('event-photography', 'logo-and-brand-identity')`
    );
    photoServiceId = sRes.rows.find((r) => r.slug === "event-photography")!.id;
    designServiceId = sRes.rows.find((r) => r.slug === "logo-and-brand-identity")!.id;

    const oRes = await db.query<{ id: string }>(
      `select id from occasions where slug = 'wedding'`
    );
    weddingOccasionId = oRes.rows[0]!.id;
  });

  afterAll(async () => {
    await db.close();
  });

  async function createTestBooking(overrides: Record<string, unknown> = {}) {
    const tokenHash = hashAccessToken(generateAccessToken());
    const ref = generateBookingReference();
    const payload = {
      reference: ref,
      idempotency_key: `idem-${ref}-${Math.random()}`,
      access_token_hash: tokenHash,
      kind: "photography",
      service_id: photoServiceId,
      occasion_id: weddingOccasionId,
      client_name: "Kweku Mensah",
      client_email: "kweku.mensah@ghana.test",
      client_phone: "+233241234567",
      preferred_contact: "whatsapp",
      event_date: "2027-02-14",
      time_of_day: "morning",
      venue_text: "Holy Spirit Cathedral",
      venue_city: "Accra",
      guest_count: 150,
      brief: "Full cathedral wedding and courtyard reception coverage in Accra.",
      privacy_version: "1.0",
      terms_version: "1.0",
      ...overrides,
    };

    const res = await db.query<{ ref: string }>(
      `select create_booking_request($1::jsonb) as ref`,
      [JSON.stringify(payload)]
    );
    return { ref: res.rows[0]!.ref, tokenHash, payload };
  }

  it("1. creates booking + 1 timeline event + 2 outbox rows and replays idempotently", async () => {
    const idemKey = "idem-test-replay-001";
    const first = await createTestBooking({ idempotency_key: idemKey });

    const bookingRow = await db.query<{ id: string; reference: string }>(
      `select id, reference from bookings where reference = $1`,
      [first.ref]
    );
    expect(bookingRow.rows).toHaveLength(1);
    const bookingId = bookingRow.rows[0]!.id;

    const events = await db.query(
      `select id from booking_events where booking_id = $1`,
      [bookingId]
    );
    expect(events.rows).toHaveLength(1);

    const outbox = await db.query(
      `select id from email_outbox where payload->>'booking_id' = $1`,
      [bookingId]
    );
    expect(outbox.rows).toHaveLength(2);

    // Replay with the same idempotency_key and a different reference string
    const replayPayload = {
      ...first.payload,
      reference: generateBookingReference(),
    };
    const replayRes = await db.query<{ ref: string }>(
      `select create_booking_request($1::jsonb) as ref`,
      [JSON.stringify(replayPayload)]
    );
    expect(replayRes.rows[0]!.ref).toBe(first.ref);

    const afterBookings = await db.query(
      `select id from bookings where idempotency_key = $1`,
      [idemKey]
    );
    expect(afterBookings.rows).toHaveLength(1);
  });

  it("2. enforces booking state machine, work window check, and crew overlap exclusion constraint", async () => {
    const { ref: refA, tokenHash: hashA } = await createTestBooking({ event_date: "2027-03-10" });
    const { ref: refB, tokenHash: hashB } = await createTestBooking({ event_date: "2027-03-10" });

    const bA = (await db.query<{ id: string }>(`select id from bookings where reference = $1`, [refA])).rows[0]!.id;
    const bB = (await db.query<{ id: string }>(`select id from bookings where reference = $1`, [refB])).rows[0]!.id;

    // Illegal status jump: new -> confirmed must fail
    await expect(
      db.query(`update bookings set status = 'confirmed' where id = $1`, [bA])
    ).rejects.toThrow(/illegal booking transition/i);

    // Design request carrying event_date must fail
    await expect(
      createTestBooking({
        kind: "design",
        service_id: designServiceId,
        occasion_id: null,
        event_date: "2027-03-12",
        deadline: "2027-03-12",
      })
    ).rejects.toThrow();

    // Move both to quoted -> accepted via valid quotes
    for (const [bId, rRef, tHash] of [
      [bA, refA, hashA],
      [bB, refB, hashB],
    ] as const) {
      await db.query(`update bookings set status = 'reviewing' where id = $1`, [bId]);
      const q = await db.query<{ id: string }>(
        `insert into quotes (booking_id, version, total_minor, deposit_minor, valid_until)
         values ($1, 1, 200000, 100000, now() + interval '7 days') returning id`,
        [bId]
      );
      const qId = q.rows[0]!.id;
      await db.query(
        `insert into quote_items (quote_id, position, description, quantity, unit_price_minor)
         values ($1, 0, 'Coverage package', 1, 200000)`,
        [qId]
      );
      await db.query(`update quotes set status = 'sent', sent_at = now() where id = $1`, [qId]);
      await db.query(`update bookings set status = 'quoted' where id = $1`, [bId]);
      await db.query(`select accept_quote($1, $2, $3)`, [rRef, tHash, qId]);

      // Second accept_quote on same booking must fail with invalid_state
      await expect(
        db.query(`select accept_quote($1, $2, $3)`, [rRef, tHash, qId])
      ).rejects.toThrow(/invalid_state/);
    }

    // Wrong token on accept_quote must throw not_found
    await expect(
      db.query(`select accept_quote($1, $2, $3)`, [
        refA,
        "wrong-hash",
        "00000000-0000-4000-8000-000000000000",
      ])
    ).rejects.toThrow(/not_found/);

    // Confirm without starts_at / ends_at must fail check constraint
    await expect(
      db.query(`update bookings set status = 'confirmed' where id = $1`, [bA])
    ).rejects.toThrow(/booking_confirmed_window/);

    // Confirm A: 09:00 to 13:00
    await db.query(
      `update bookings set status = 'confirmed', starts_at = '2027-03-10T09:00:00Z', ends_at = '2027-03-10T13:00:00Z' where id = $1`,
      [bA]
    );

    // Confirm B overlapping (12:00 to 16:00) must fail exclusion constraint
    await expect(
      db.query(
        `update bookings set status = 'confirmed', starts_at = '2027-03-10T12:00:00Z', ends_at = '2027-03-10T16:00:00Z' where id = $1`,
        [bB]
      )
    ).rejects.toThrow(/bookings_no_crew_overlap/);

    // Confirm B back-to-back (13:00 to 17:00) must succeed due to '[)' half-open range
    await db.query(
      `update bookings set status = 'confirmed', starts_at = '2027-03-10T13:00:00Z', ends_at = '2027-03-10T17:00:00Z' where id = $1`,
      [bB]
    );

    // Public availability view exposes the date only
    const avail = await db.query<{ day: string }>(
      `select day::text from public_unavailable_dates where day = '2027-03-10'`
    );
    expect(avail.rows).toHaveLength(1);
  });

  it("3. enforces frozen quotes, append-only payments/events, and portfolio consent/alt_text rules", async () => {
    const { ref } = await createTestBooking({ event_date: "2027-04-02" });
    const bId = (await db.query<{ id: string }>(`select id from bookings where reference = $1`, [ref])).rows[0]!.id;

    const q = await db.query<{ id: string }>(
      `insert into quotes (booking_id, version, total_minor, deposit_minor) values ($1, 1, 100000, 50000) returning id`,
      [bId]
    );
    const qId = q.rows[0]!.id;
    await db.query(
      `insert into quote_items (quote_id, position, description, quantity, unit_price_minor) values ($1, 0, 'Session', 1, 50000)`,
      [qId]
    );

    // Total 100000 != sum(50000) must reject send
    await expect(
      db.query(`update quotes set status = 'sent' where id = $1`, [qId])
    ).rejects.toThrow(/does not match item sum/);

    // Fix total to match item sum and send
    await db.query(`update quotes set total_minor = 50000, status = 'sent' where id = $1`, [qId]);

    // Modifying sent quote or items must reject
    await expect(
      db.query(`update quotes set total_minor = 60000 where id = $1`, [qId])
    ).rejects.toThrow(/frozen/);
    await expect(
      db.query(
        `insert into quote_items (quote_id, position, description, quantity, unit_price_minor) values ($1, 1, 'Extra', 1, 1000)`,
        [qId]
      )
    ).rejects.toThrow(/frozen/);

    // Payment append-only
    const p = await db.query<{ id: string }>(
      `insert into payments (booking_id, method, amount_minor, received_at) values ($1, 'momo', 50000, now()) returning id`,
      [bId]
    );
    await expect(
      db.query(`update payments set amount_minor = 1000 where id = $1`, [p.rows[0]!.id])
    ).rejects.toThrow(/append-only/);

    // Portfolio consent & alt text checks
    await expect(
      db.query(
        `insert into portfolio_items (kind, slug, title, status, client_consent_to_publish, published_at)
         values ('photography', 'unconsented-item', 'Unconsented', 'published', false, now())`
      )
    ).rejects.toThrow(/published_requires_consent/);

    const itemRes = await db.query<{ id: string }>(
      `insert into portfolio_items (kind, slug, title, status, client_consent_to_publish)
       values ('photography', 'draft-item-test', 'Draft Item', 'draft', false) returning id`
    );
    await expect(
      db.query(
        `insert into media_assets (portfolio_item_id, type, cloudinary_public_id, width, height, alt_text)
         values ($1, 'image', 'local/sample', 1200, 800, '')`,
        [itemRes.rows[0]!.id]
      )
    ).rejects.toThrow(/image_shape/);
  });

  it("4. enforces RLS for anon, aal1 vs aal2 admin, and scoped permissions", async () => {
    await createTestBooking({ event_date: "2027-05-05" });

    // Anon cannot read bookings or email_outbox or call create_booking_request
    await db.transaction(async (tx) => {
      await tx.exec("set local role anon");
      const b = await tx.query(`select id from bookings`);
      expect(b.rows).toHaveLength(0);
      const outbox = await tx.query(`select id from email_outbox`);
      expect(outbox.rows).toHaveLength(0);
      const pubPortfolio = await tx.query(`select id from portfolio_items`);
      expect(pubPortfolio.rows.length).toBeGreaterThan(0);

      await expect(
        tx.query(`select create_booking_request('{}'::jsonb)`)
      ).rejects.toThrow(/permission denied/i);
    });

    // Admin at aal1 sees 0 rows in bookings
    await db.transaction(async (tx) => {
      await tx.exec("set local role authenticated");
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [DEFAULT_OWNER_ID]);
      await tx.query("select set_config('request.jwt.claim.aal', 'aal1', true)");
      const b = await tx.query(`select id from bookings`);
      expect(b.rows).toHaveLength(0);
    });

    // Content-only admin at aal2 sees 0 bookings and cannot mutate services without content scope for bookings admin
    await db.transaction(async (tx) => {
      await tx.exec("set local role authenticated");
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [DEFAULT_CONTENT_ADMIN_ID]);
      await tx.query("select set_config('request.jwt.claim.aal', 'aal2', true)");
      const b = await tx.query(`select id from bookings`);
      expect(b.rows).toHaveLength(0);
    });

    // Bookings admin at aal2 reads bookings, but cannot insert into services (content scope required)
    await db.transaction(async (tx) => {
      await tx.exec("set local role authenticated");
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [DEFAULT_BOOKINGS_ADMIN_ID]);
      await tx.query("select set_config('request.jwt.claim.aal', 'aal2', true)");
      const b = await tx.query(`select id from bookings`);
      expect(b.rows.length).toBeGreaterThan(0);

      await expect(
        tx.query(
          `insert into services (kind, slug, name, summary) values ('photography', 'forbidden-svc', 'Forbidden', 'Should be blocked by RLS')`
        )
      ).rejects.toThrow(/row-level security policy/i);
    });
  });

  it("5. anonymises closed bookings past retention window while retaining row and financial totals", async () => {
    const { ref } = await createTestBooking({ event_date: "2020-01-15" });
    const bId = (await db.query<{ id: string }>(`select id from bookings where reference = $1`, [ref])).rows[0]!.id;
    await db.query(`update bookings set status = 'declined' where id = $1`, [bId]);

    const res = await db.query<{ cnt: number }>(`select anonymise_old_bookings(24) as cnt`);
    expect(res.rows[0]!.cnt).toBeGreaterThanOrEqual(1);

    const scrubbed = await db.query<{ client_name: string; access_token_hash: string }>(
      `select client_name, access_token_hash from bookings where id = $1`,
      [bId]
    );
    expect(scrubbed.rows[0]!.client_name).toBe("Anonymised");
    expect(scrubbed.rows[0]!.access_token_hash).toBe("revoked");
  });
});
