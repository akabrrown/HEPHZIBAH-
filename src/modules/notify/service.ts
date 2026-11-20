import { renderEmailTemplate } from "@/emails/templates";
import { withServiceRole } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { ProblemError } from "@/lib/errors";
import { findSiteSettings } from "@/modules/catalog/repository";
import {
  enqueueOutboxEmail,
  fetchDueOutboxEmails,
  listRecentOutboxAdmin,
  markOutboxFailed,
  markOutboxSent,
  type OutboxEmailRow,
} from "./repository";

export interface EmailTransport {
  send(message: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void>;
}

const resendOrLocalTransport: EmailTransport = {
  async send(message) {
    const env = getServerEnv();
    if (!env.RESEND_API_KEY) {
      // Local / test environment: structured log delivery without external API dependency
      console.info(
        JSON.stringify({
          level: "info",
          event: "email_delivered_local",
          to: message.to,
          subject: message.subject,
        })
      );
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    let res: Response;
    try {
      res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: message.from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      throw new Error(`Resend HTTP ${res.status}: ${bodyText.slice(0, 200)}`);
    }
  },
};

export async function processEmailOutbox(
  transport: EmailTransport = resendOrLocalTransport
): Promise<{ sent: number; failed: number }> {
  const env = getServerEnv();
  const { settings, due } = await withServiceRole(async (tx) => {
    const [settingsRow, dueRows] = await Promise.all([
      findSiteSettings(tx),
      fetchDueOutboxEmails(tx, 25),
    ]);
    return { settings: settingsRow, due: dueRows };
  });

  const bookingIdsToEnrich = Array.from(
    new Set(
      due
        .filter((row) => !row.payload?.reference && typeof row.payload?.booking_id === "string")
        .map((row) => row.payload.booking_id as string)
    )
  );

  const bookingInfoMap = new Map<
    string,
    {
      reference: string;
      client_name: string;
      service_name: string;
      event_date: string | null;
      deadline: string | null;
    }
  >();

  if (bookingIdsToEnrich.length > 0) {
    await withServiceRole(async (tx) => {
      const bRes = await tx.query<{
        id: string;
        reference: string;
        client_name: string;
        service_name: string;
        event_date: string | null;
        deadline: string | null;
      }>(
        `select b.id, b.reference, b.client_name, s.name as service_name,
                b.event_date::text as event_date, b.deadline::text as deadline
           from bookings b
           join services s on s.id = b.service_id
          where b.id = any($1::uuid[])`,
        [bookingIdsToEnrich]
      );
      for (const b of bRes.rows) {
        bookingInfoMap.set(b.id, {
          reference: b.reference,
          client_name: b.client_name,
          service_name: b.service_name,
          event_date: b.event_date,
          deadline: b.deadline,
        });
      }
    });
  }

  let sent = 0;
  let failed = 0;

  for (const row of due) {
    try {
      const enrichedPayload = { ...row.payload };
      if (!enrichedPayload.reference && typeof enrichedPayload.booking_id === "string") {
        const bookingInfo = bookingInfoMap.get(enrichedPayload.booking_id);
        if (bookingInfo) {
          Object.assign(enrichedPayload, bookingInfo);
        }
      }

      const rendered = renderEmailTemplate(
        row.template,
        enrichedPayload,
        settings,
        env.NEXT_PUBLIC_SITE_URL
      );

      await transport.send({
        from: env.EMAIL_FROM,
        to: row.to_email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });

      await withServiceRole((tx) => markOutboxSent(tx, row.id));
      sent += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Email send failed";
      await withServiceRole((tx) => markOutboxFailed(tx, row.id, msg));
      failed += 1;
    }
  }

  return { sent, failed };
}

export async function retryOutboxMessage(outboxId: string): Promise<{
  id: string;
  status: OutboxEmailRow["status"];
  lastError: string | null;
}> {
  const found = await withServiceRole(async (tx) => {
    const res = await tx.query<{ id: string }>(
      `update email_outbox
          set status = 'pending',
              attempts = 0,
              last_error = null,
              next_attempt_at = now()
        where id = $1::uuid
        returning id`,
      [outboxId]
    );
    return res.rows[0] ?? null;
  });
  if (!found) {
    throw new ProblemError(404, "not_found", "Outbox item not found", "No queued email matches that ID.");
  }

  await processEmailOutbox();

  const updated = await withServiceRole(async (tx) => {
    const res = await tx.query<{ status: OutboxEmailRow["status"]; last_error: string | null }>(
      `select status, last_error from email_outbox where id = $1::uuid`,
      [outboxId]
    );
    return res.rows[0] ?? null;
  });

  return {
    id: outboxId,
    status: updated?.status ?? "failed",
    lastError: updated?.last_error ?? null,
  };
}

export async function listOutboxForAdmin(): Promise<OutboxEmailRow[]> {
  return withServiceRole((tx) => listRecentOutboxAdmin(tx, 60));
}

export async function queueShootReminders(): Promise<number> {
  return withServiceRole(async (tx) => {
    const due = await tx.query<{
      id: string;
      reference: string;
      client_email: string;
      client_name: string;
      starts_at: string;
      event_date: string | null;
    }>(
      `select b.id, b.reference, b.client_email::text as client_email, b.client_name,
              b.starts_at::text as starts_at, b.event_date::text as event_date
         from bookings b
        where b.status = 'confirmed'
          and b.kind <> 'design'
          and b.starts_at is not null
          and b.starts_at > now()
          and b.starts_at <= now() + interval '48 hours'
          and not exists (
            select 1 from email_outbox e
             where e.dedupe_key = 'shoot-reminder:' || b.id
          )`
    );

    for (const row of due.rows) {
      await enqueueOutboxEmail(tx, {
        dedupeKey: `shoot-reminder:${row.id}`,
        toEmail: row.client_email,
        template: "shoot_reminder",
        payload: {
          booking_id: row.id,
          reference: row.reference,
          client_name: row.client_name,
          starts_at: row.starts_at,
          event_date: row.event_date,
        },
      });
    }

    return due.rows.length;
  });
}

export async function runRetentionCleanup(): Promise<{
  bookingsAnonymised: number;
  enquiriesDeleted: number;
  outboxDeleted: number;
}> {
  return withServiceRole(async (tx) => {
    const bRes = await tx.query<{ cnt: number }>(`select anonymise_old_bookings(24) as cnt`);
    const cRes = await tx.query<{ res: { enquiries_deleted: number; outbox_deleted: number } }>(
      `select cleanup_old_enquiries_and_outbox(12, 90) as res`
    );
    return {
      bookingsAnonymised: bRes.rows[0]?.cnt ?? 0,
      enquiriesDeleted: cRes.rows[0]?.res?.enquiries_deleted ?? 0,
      outboxDeleted: cRes.rows[0]?.res?.outbox_deleted ?? 0,
    };
  });
}
