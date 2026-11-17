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
    `select u.id, u.email, u.password_hash, u.totp_secret,
            a.display_name, a.scopes, a.is_active
       from auth.users u
       join admin_users a on a.id = u.id
      where lower(u.email) = lower($1)`,
    [email.trim()]
  );
  return res.rows[0] ?? null;
}

export async function findAuthAdminById(
  tx: DbTx,
  adminId: string
): Promise<AuthAdminRow | null> {
  const res = await tx.query<AuthAdminRow>(
    `select u.id, u.email, u.password_hash, u.totp_secret,
            a.display_name, a.scopes, a.is_active
       from auth.users u
       join admin_users a on a.id = u.id
      where u.id = $1::uuid`,
    [adminId]
  );
  return res.rows[0] ?? null;
}

export async function findAllTeamAdmins(tx: DbTx): Promise<AdminUserRecord[]> {
  const res = await tx.query<AdminUserRecord>(
    `select a.id, coalesce(u.email, '') as email, a.display_name, a.scopes, a.is_active, a.created_at::text as created_at
       from admin_users a
       left join auth.users u on u.id = a.id
      order by a.created_at asc`
  );
  return res.rows;
}
