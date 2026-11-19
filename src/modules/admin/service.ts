import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  generateTotpCode,
  hashPassword,
  isPasswordBreached,
  verifyPassword,
  verifyTotpCode,
  type AdminSessionPayload,
} from "@/lib/auth";
import { withAdminRole, withServiceRole } from "@/lib/db";
import { ProblemError } from "@/lib/errors";
import { checkSlidingWindowLimit } from "@/lib/rate-limit";
import {
  findAllTeamAdmins,
  findAuthAdminByEmail,
  findAuthAdminById,
} from "./repository";
import {
  adminSignInSchema,
  adminTeamCreateSchema,
  adminTeamUpdateSchema,
  adminVerifyTotpSchema,
  type AdminUserRecord,
} from "./schema";

export async function authenticateAdminPassword(
  rawInput: unknown,
  sourceKey: string
): Promise<AdminSessionPayload> {
  const parsed = adminSignInSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ProblemError(422, "validation_error", "Check sign-in fields", "Enter a valid email and password.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }
  const { email, password } = parsed.data;

  // Rate limit: 5 failed attempts per account/source per 15 minutes (TDD 5.4)
  const rateKey = `admin-signin:${email.toLowerCase()}:${sourceKey}`;
  const limit = checkSlidingWindowLimit(`probe:${rateKey}`, 100, 15 * 60_000);
  if (!limit.allowed) {
    throw new ProblemError(429, "rate_limited", "Too many attempts", "Wait 15 minutes before trying again.");
  }

  const admin = await withServiceRole((tx) => findAuthAdminByEmail(tx, email));
  if (!admin || !admin.is_active || !verifyPassword(password, admin.password_hash)) {
    const failed = checkSlidingWindowLimit(rateKey, 5, 15 * 60_000);
    if (!failed.allowed) {
      throw new ProblemError(
        429,
        "account_locked",
        "Sign-in temporarily locked",
        "Too many failed attempts. Wait 15 minutes and try again.",
        { headers: { "Retry-After": String(failed.retryAfterSeconds) } }
      );
    }
    throw new ProblemError(401, "invalid_credentials", "Invalid email or password", "Check your credentials and try again.");
  }

  return {
    adminId: admin.id,
    email: admin.email,
    displayName: admin.display_name,
    scopes: admin.scopes,
    aal: "aal1",
    exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60,
    jti: crypto.randomUUID(),
    totpHint: admin.totp_secret ? generateTotpCode(admin.totp_secret) : undefined,
  };
}

export async function verifyAdminTotpAndUpgradeSession(
  currentSession: AdminSessionPayload,
  rawInput: unknown
): Promise<AdminSessionPayload> {
  const parsed = adminVerifyTotpSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ProblemError(422, "validation_error", "Invalid authenticator code", "Enter the 6-digit code from your authenticator app.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  const admin = await withServiceRole((tx) => findAuthAdminById(tx, currentSession.adminId));
  if (!admin || !admin.is_active || !admin.totp_secret) {
    throw new ProblemError(403, "forbidden", "Authenticator not configured", "Ask the studio owner to reset your authenticator.");
  }

  const ok = verifyTotpCode(admin.totp_secret, parsed.data.code);
  if (!ok) {
    throw new ProblemError(401, "invalid_totp", "Incorrect authenticator code", "Check the 6-digit code in your authenticator app and try again.");
  }

  return {
    ...currentSession,
    displayName: admin.display_name,
    scopes: admin.scopes,
    aal: "aal2",
    exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60,
  };
}

export async function getAdminDashboardSummary(admin: AdminSessionPayload) {
  const summary = await withAdminRole(admin.adminId, admin.aal, async (tx) => {
    const canViewBookings = admin.scopes.includes("bookings");

    const needsReply = canViewBookings
      ? (
          await tx.query<{
            id: string;
            reference: string;
            kind: string;
            client_name: string;
            event_date: string | null;
            deadline: string | null;
            created_at: string;
          }>(
            `select id, reference, kind, client_name, event_date::text as event_date, deadline::text as deadline, created_at::text as created_at
               from bookings
              where status = 'new'
              order by created_at asc
              limit 15`
          )
        ).rows
      : [];

    const quotesWaiting = canViewBookings
      ? (
          await tx.query<{
            id: string;
            reference: string;
            client_name: string;
            total_minor: number;
            valid_until: string | null;
          }>(
            `select b.id, b.reference, b.client_name, q.total_minor, q.valid_until::text as valid_until
               from bookings b
               join quotes q on q.booking_id = b.id and q.status = 'sent'
              where b.status = 'quoted'
              order by q.valid_until asc nulls last
              limit 15`
          )
        ).rows
      : [];

    const depositsAwaited = canViewBookings
      ? (
          await tx.query<{
            id: string;
            reference: string;
            client_name: string;
            event_date: string | null;
            deposit_minor: number;
          }>(
            `select b.id, b.reference, b.client_name, b.event_date::text as event_date,
                    coalesce(q.deposit_minor, 0) as deposit_minor
               from bookings b
               left join quotes q on q.id = b.accepted_quote_id
              where b.status = 'accepted'
                and coalesce((
                  select sum(case when p.is_refund then -p.amount_minor else p.amount_minor end)
                    from payments p
                   where p.booking_id = b.id
                ), 0) < coalesce(q.deposit_minor, 1)
              order by b.updated_at asc
              limit 15`
          )
        ).rows
      : [];

    const thisWeek = canViewBookings
      ? (
          await tx.query<{
            id: string;
            reference: string;
            client_name: string;
            kind: string;
            venue_text: string | null;
            venue_city: string | null;
            starts_at: string | null;
            ends_at: string | null;
          }>(
            `select id, reference, client_name, kind, venue_text, venue_city,
                    starts_at::text as starts_at, ends_at::text as ends_at
               from bookings
              where status = 'confirmed'
                and (
                  (starts_at >= now() and starts_at <= now() + interval '7 days')
                  or (event_date >= current_date and event_date <= current_date + 7)
                )
              order by coalesce(starts_at, event_date::timestamptz) asc`
          )
        ).rows
      : [];

    const medianFirstResponseHours = canViewBookings
      ? (
          await tx.query<{ median_hours: number | null }>(
            `select round((percentile_cont(0.5) within group (
               order by extract(epoch from (first_ev.first_at - b.created_at)) / 3600.0
             ))::numeric, 1)::float8 as median_hours
               from bookings b
               join lateral (
                 select min(e.created_at) as first_at
                   from booking_events e
                  where e.booking_id = b.id
                    and e.actor_type = 'admin'
               ) first_ev on first_ev.first_at is not null`
          )
        ).rows[0]?.median_hours ?? null
      : null;

    return {
      needsReply,
      quotesWaiting,
      depositsAwaited,
      thisWeek,
      medianFirstResponseHours,
    };
  });

  const emailProblems = await withServiceRole(async (svcTx) => {
    const res = await svcTx.query<{
      id: string;
      to_email: string;
      template: string;
      status: string;
      attempts: number;
      last_error: string | null;
      created_at: string;
    }>(
      `select id, to_email::text as to_email, template, status, attempts, last_error, created_at::text as created_at
         from email_outbox
        where status in ('failed', 'dead')
           or (status = 'pending' and created_at < now() - interval '30 minutes')
        order by created_at desc
        limit 20`
    );
    return res.rows;
  });

  return {
    ...summary,
    emailProblems,
  };
}

function generateBase32Secret(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes = crypto.randomBytes(20);
  let out = "";
  for (const b of bytes) {
    out += alphabet[b % alphabet.length] ?? "A";
  }
  return out;
}

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || !process.env.DATABASE_URL || process.env.NODE_ENV === "test") {
    return null;
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function listTeamAdmins(admin: AdminSessionPayload): Promise<AdminUserRecord[]> {
  return withAdminRole(admin.adminId, admin.aal, (tx) => findAllTeamAdmins(tx));
}

export async function createTeamAdmin(
  admin: AdminSessionPayload,
  rawInput: unknown
): Promise<{ user: AdminUserRecord; totpSecret: string; sampleCode: string }> {
  const parsed = adminTeamCreateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ProblemError(422, "validation_error", "Check team member fields", "Invalid admin details.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }
  const v = parsed.data;
  if (await isPasswordBreached(v.password)) {
    throw new ProblemError(
      422,
      "breached_password",
      "Choose a stronger password",
      "That password appeared in a known public data breach. Pick a unique password or use Generate.",
      {
        fieldErrors: {
          password: [
            "This password appeared in a known public data breach. Choose a unique password or click Generate.",
          ],
        },
      }
    );
  }

  const normalizedEmail = v.email.toLowerCase();
  const passwordHash = hashPassword(v.password);
  const totpSecret = generateBase32Secret();

  await withServiceRole(async (svcTx) => {
    const existing = await findAuthAdminByEmail(svcTx, normalizedEmail);
    if (existing) {
      throw new ProblemError(409, "email_exists", "Admin email already exists", "Use a distinct email per team member.");
    }
  });

  const supabaseAdmin = getSupabaseAdminClient();
  let userId: string = crypto.randomUUID();
  let createdInSupabase = false;

  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: v.password,
      email_confirm: true,
      user_metadata: { display_name: v.display_name },
    });
    if (error || !data.user) {
      if (error?.message?.toLowerCase().includes("already")) {
        // User may exist in Supabase Auth after being removed from public.admin_users; re-link cleanly
        const { data: listed } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const existingAuthUser = listed?.users?.find(
          (u) => u.email?.toLowerCase() === normalizedEmail
        );
        if (existingAuthUser) {
          await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
            password: v.password,
            email_confirm: true,
            user_metadata: { display_name: v.display_name },
          });
          userId = existingAuthUser.id;
        } else {
          throw new ProblemError(
            409,
            "email_exists",
            "Admin email already exists",
            "Use a distinct email per team member."
          );
        }
      } else {
        throw new ProblemError(
          500,
          "auth_create_failed",
          "Unable to create auth account",
          error?.message ?? "Supabase Auth error."
        );
      }
    } else {
      userId = data.user.id;
      createdInSupabase = true;
    }
  } else {
    await withServiceRole(async (svcTx) => {
      await svcTx.query(
        `insert into auth.users (id, email, password_hash, totp_secret) values ($1::uuid, $2, $3, $4)`,
        [userId, normalizedEmail, passwordHash, totpSecret]
      );
    });
  }

  try {
    const created = await withAdminRole(admin.adminId, admin.aal, async (tx) => {
      const res = await tx.query<AdminUserRecord>(
        `insert into admin_users (id, email, password_hash, totp_secret, display_name, scopes, is_active)
         values ($1::uuid, $2, $3, $4, $5, $6, true)
         returning id, email, display_name, scopes, is_active, created_at::text as created_at`,
        [userId, normalizedEmail, passwordHash, totpSecret, v.display_name, v.scopes]
      );
      return res.rows[0]!;
    });

    return {
      user: created,
      totpSecret,
      sampleCode: generateTotpCode(totpSecret),
    };
  } catch (err) {
    if (supabaseAdmin && createdInSupabase) {
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => undefined);
    } else {
      await withServiceRole(async (svcTx) => {
        await svcTx.query(`delete from auth.users where id = $1::uuid`, [userId]);
      }).catch(() => undefined);
    }
    throw err;
  }
}

export async function updateTeamAdmin(
  admin: AdminSessionPayload,
  rawInput: unknown
): Promise<{ user: AdminUserRecord; newTotpSecret?: string }> {
  const parsed = adminTeamUpdateSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ProblemError(422, "validation_error", "Check team member update", "Invalid update payload.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }
  const v = parsed.data;

  const updated = await withAdminRole(admin.adminId, admin.aal, async (tx) => {
    const all = await findAllTeamAdmins(tx);
    const target = all.find((u) => u.id === v.id);
    if (!target) {
      throw new ProblemError(404, "not_found", "Admin user not found", "No admin matches that ID.");
    }

    const nextActive = typeof v.is_active === "boolean" ? v.is_active : target.is_active;
    const nextScopes = v.scopes ?? target.scopes;

    const remainingTeamAdmins = all.filter((u) => {
      if (u.id === target.id) {
        return nextActive && nextScopes.includes("team");
      }
      return u.is_active && u.scopes.includes("team");
    });

    if (remainingTeamAdmins.length === 0) {
      throw new ProblemError(
        409,
        "last_team_admin",
        "Cannot remove the last team owner",
        "Keep at least one active admin with the team scope."
      );
    }

    const res = await tx.query<AdminUserRecord>(
      `update admin_users
          set display_name = coalesce($2, display_name),
              scopes = $3,
              is_active = $4
        where id = $1::uuid
        returning id, $5::text as email, display_name, scopes, is_active, created_at::text as created_at`,
      [target.id, v.display_name ?? null, nextScopes, nextActive, target.email]
    );
    return res.rows[0]!;
  });

  let newTotpSecret: string | undefined;
  if (v.reset_totp) {
    newTotpSecret = generateBase32Secret();
    await withServiceRole(async (svcTx) => {
      await svcTx.query(`update admin_users set totp_secret = $2 where id = $1::uuid`, [
        updated.id,
        newTotpSecret,
      ]);
    });
  }

  return { user: updated, newTotpSecret };
}
