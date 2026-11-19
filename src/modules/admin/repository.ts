import type { DbTx } from "@/lib/db";
import type { AdminScopeValue, AdminUserRecord } from "./schema";

export interface AuthAdminRow {
  id: string;
  email: string;
  password_hash: string;
  totp_secret: string | null;
  display_name: string;
  scopes: AdminScopeValue[];
  is_active: boolean;
}

export async function findAuthAdminByEmail(
  tx: DbTx,
  email: string
): Promise<AuthAdminRow | null> {
  const res = await tx.query<AuthAdminRow>(
    `select id,
            coalesce(email, '') as email,
            coalesce(password_hash, '') as password_hash,
            totp_secret,
            display_name,
            scopes,
            is_active
       from admin_users
      where lower(coalesce(email, '')) = lower($1)`,
    [email.trim()]
  );
  return res.rows[0] ?? null;
}

export async function findAuthAdminById(
  tx: DbTx,
  adminId: string
): Promise<AuthAdminRow | null> {
  const res = await tx.query<AuthAdminRow>(
    `select id,
            coalesce(email, '') as email,
            coalesce(password_hash, '') as password_hash,
            totp_secret,
            display_name,
            scopes,
            is_active
       from admin_users
      where id = $1::uuid`,
    [adminId]
  );
  return res.rows[0] ?? null;
}

export async function findAllTeamAdmins(tx: DbTx): Promise<AdminUserRecord[]> {
  const res = await tx.query<AdminUserRecord>(
    `select id,
            coalesce(email, '') as email,
            display_name,
            scopes,
            is_active,
            created_at::text as created_at
       from admin_users
      order by created_at asc`
  );
  return res.rows;
}
