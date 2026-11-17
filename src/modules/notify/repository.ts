import type { DbTx } from "@/lib/db";

export interface OutboxEmailRow {
  id: string;
  dedupe_key: string;
  to_email: string;
  template: string;
  payload: Record<string, unknown>;
  status: "pending" | "sent" | "failed" | "dead";
  attempts: number;
  next_attempt_at: string;
  last_error: string | null;
  sent_at: string | null;
  created_at: string;
}

export async function enqueueOutboxEmail(
  tx: DbTx,
  input: {
    dedupeKey: string;
    toEmail: string;
    template: string;
    payload: Record<string, unknown>;
  }
): Promise<void> {
  await tx.query(
    `insert into email_outbox (dedupe_key, to_email, template, payload)
     values ($1, $2::citext, $3, $4::jsonb)
     on conflict (dedupe_key) do nothing`,
    [input.dedupeKey, input.toEmail, input.template, JSON.stringify(input.payload)]
  );
}

export async function fetchDueOutboxEmails(tx: DbTx, limit = 25): Promise<OutboxEmailRow[]> {
  const res = await tx.query<OutboxEmailRow>(
    `select id, dedupe_key, to_email::text as to_email, template, payload, status,
            attempts, next_attempt_at::text, last_error, sent_at::text, created_at::text
       from email_outbox
      where status in ('pending', 'failed')
        and next_attempt_at <= now()
      order by next_attempt_at asc
      limit $1`,
    [limit]
  );
  return res.rows;
}

export async function markOutboxSent(tx: DbTx, id: string): Promise<void> {
  await tx.query(
    `update email_outbox
        set status = 'sent',
            attempts = attempts + 1,
            sent_at = now(),
            last_error = null
      where id = $1::uuid`,
    [id]
  );
}

export async function markOutboxFailed(
  tx: DbTx,
  id: string,
  errorMessage: string,
  maxHours = 24
): Promise<void> {
  await tx.query(
    `update email_outbox
        set attempts = attempts + 1,
            last_error = $2,
            status = case
              when created_at < now() - make_interval(hours => $3) or attempts + 1 >= 12 then 'dead'::outbox_status
              else 'failed'::outbox_status
            end,
            next_attempt_at = now() + (least(60, power(2, least(attempts, 6))::integer) * interval '1 minute')
      where id = $1::uuid`,
    [id, errorMessage.slice(0, 500), maxHours]
  );
}

export async function listRecentOutboxAdmin(tx: DbTx, limit = 50): Promise<OutboxEmailRow[]> {
  const res = await tx.query<OutboxEmailRow>(
    `select id, dedupe_key, to_email::text as to_email, template, payload, status,
            attempts, next_attempt_at::text, last_error, sent_at::text, created_at::text
       from email_outbox
      order by created_at desc
      limit $1`,
    [limit]
  );
  return res.rows;
}
