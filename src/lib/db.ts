import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { citext } from "@electric-sql/pglite/contrib/citext";
import {
  DEFAULT_BOOKINGS_ADMIN_ID,
  DEFAULT_CONTENT_ADMIN_ID,
  DEFAULT_OWNER_ID,
  EXTRA_SEED_SQL,
  SEED_ADMIN_PASSWORD,
  SEED_BOOKINGS_TOTP_SECRET,
  SEED_CONTENT_TOTP_SECRET,
  SEED_OWNER_TOTP_SECRET,
} from "@/lib/seed-data";

export interface DbQueryResult<T = Record<string, unknown>> {
  rows: T[];
  affectedRows?: number;
}

export interface DbTx {
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ): Promise<DbQueryResult<T>>;
  exec(sql: string): Promise<unknown>;
}

const STANDIN_AUTH_AND_ROLES_SQL = `
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  totp_secret text,
  created_at timestamptz not null default now()
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'sub', nullif(current_setting('request.jwt.claim.sub', true), ''),
    'aal', coalesce(nullif(current_setting('request.jwt.claim.aal', true), ''), 'aal1')
  );
$$;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;
`;

const POST_SCHEMA_ROLE_GRANTS_SQL = `
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all tables in schema auth to service_role;
grant all on all sequences in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select (id, email) on auth.users to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select on all tables in schema public to anon;
grant select on public_unavailable_dates, current_legal_documents to anon, authenticated, service_role;
grant execute on function has_scope(text) to anon, authenticated, service_role;
`;

function hashScryptLocal(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto
    .scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 })
    .toString("hex");
  return `scrypt$${salt}$${derived}`;
}

function readSqlFile(relativePath: string): string {
  const fullPath = path.join(process.cwd(), relativePath);
  return fs.readFileSync(fullPath, "utf8");
}

async function seedDefaultAdmins(pg: PGlite): Promise<void> {
  const passwordHash = hashScryptLocal(SEED_ADMIN_PASSWORD);

  const admins = [
    {
      id: DEFAULT_OWNER_ID,
      email: "owner@hephzibahmedia.com",
      displayName: "Kofi Mensah (Owner)",
      totpSecret: SEED_OWNER_TOTP_SECRET,
      scopes: ["bookings", "content", "settings", "team"],
    },
    {
      id: DEFAULT_CONTENT_ADMIN_ID,
      email: "content@hephzibahmedia.com",
      displayName: "Ama Boateng (Content)",
      totpSecret: SEED_CONTENT_TOTP_SECRET,
      scopes: ["content"],
    },
    {
      id: DEFAULT_BOOKINGS_ADMIN_ID,
      email: "bookings@hephzibahmedia.com",
      displayName: "Yaw Darko (Bookings)",
      totpSecret: SEED_BOOKINGS_TOTP_SECRET,
      scopes: ["bookings"],
    },
  ];

  for (const admin of admins) {
    await pg.query(
      `insert into auth.users (id, email, password_hash, totp_secret)
       values ($1, $2, $3, $4)
       on conflict (id) do nothing`,
      [admin.id, admin.email, passwordHash, admin.totpSecret]
    );
    await pg.query(
      `insert into admin_users (id, display_name, scopes, is_active)
       values ($1, $2, $3, true)
       on conflict (id) do nothing`,
      [admin.id, admin.displayName, admin.scopes]
    );
  }
}

export async function initializePostgresInstance(pg: PGlite): Promise<void> {
  const existing = await pg.query<{ tbl: string | null }>(
    "select to_regclass('public.bookings')::text as tbl"
  );
  if (existing.rows[0]?.tbl) {
    await pg.exec(POST_SCHEMA_ROLE_GRANTS_SQL);
    await pg.exec(`
      alter table bookings
        add column if not exists gallery_url text check (gallery_url is null or char_length(gallery_url) <= 1000),
        add column if not exists gallery_pin text check (gallery_pin is null or char_length(gallery_pin) <= 60),
        add column if not exists gallery_notes text check (gallery_notes is null or char_length(gallery_notes) <= 2000),
        add column if not exists gallery_expires_at timestamptz;

      update site_settings
         set social = jsonb_set(
               jsonb_set(
                 social,
                 '{instagram}',
                 '"https://www.instagram.com/hephzibahphotography_"'::jsonb,
                 true
               ),
               '{tiktok}',
               '"https://www.tiktok.com/@hephzibah_photography?_r=1&_t=ZS-9BTfXSCc6bf"'::jsonb,
               true
             )
       where id = 1
         and (social->>'tiktok' is null or social->>'instagram' = 'https://instagram.com/hephzibahmedia');
    `);
    return;
  }

  await pg.exec(STANDIN_AUTH_AND_ROLES_SQL);
  const schemaSql = readSqlFile("supabase/migrations/0001_hephzibah_schema.sql");
  await pg.exec(schemaSql);
  const retentionSql = readSqlFile(
    "supabase/migrations/0002_retention_enquiries_outbox.sql"
  );
  await pg.exec(retentionSql);
  const gallerySql = readSqlFile(
    "supabase/migrations/0003_gallery_downloads.sql"
  );
  await pg.exec(gallerySql);
  await pg.exec(POST_SCHEMA_ROLE_GRANTS_SQL);

  const seedSql = readSqlFile("supabase/seed.sql");
  await pg.exec(seedSql);
  await pg.exec(EXTRA_SEED_SQL);
  await seedDefaultAdmins(pg);
}

declare global {
  var __hephzibahPgPromise: Promise<PGlite> | undefined;
}

function resolvePgliteDataDir(): string {
  const configured = process.env.PGLITE_DATA_DIR?.trim();
  if (configured) {
    return configured;
  }
  if (process.env.NODE_ENV === "test") {
    return "memory://";
  }
  const dir = path.join(process.cwd(), ".pglite", "hephzibah");
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  return dir;
}

export async function createFreshTestDb(): Promise<PGlite> {
  const pg = new PGlite({
    dataDir: "memory://",
    extensions: { btree_gist, citext },
  });
  await pg.waitReady;
  await initializePostgresInstance(pg);
  return pg;
}

export async function getDb(): Promise<PGlite> {
  if (!globalThis.__hephzibahPgPromise) {
    globalThis.__hephzibahPgPromise = (async () => {
      const dataDir = resolvePgliteDataDir();
      const pg = new PGlite({
        dataDir,
        extensions: { btree_gist, citext },
      });
      await pg.waitReady;
      await initializePostgresInstance(pg);
      return pg;
    })();
  }
  return globalThis.__hephzibahPgPromise;
}

export function setTestDbInstance(pg: PGlite): void {
  globalThis.__hephzibahPgPromise = Promise.resolve(pg);
}

export async function resetGlobalDbForTests(): Promise<PGlite> {
  const fresh = await createFreshTestDb();
  setTestDbInstance(fresh);
  return fresh;
}

export async function withServiceRole<T>(fn: (tx: DbTx) => Promise<T>): Promise<T> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await tx.exec("set local role service_role");
    return fn(tx as unknown as DbTx);
  });
}

export async function withAnonRole<T>(fn: (tx: DbTx) => Promise<T>): Promise<T> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await tx.exec("set local role anon");
    return fn(tx as unknown as DbTx);
  });
}

export async function withAdminRole<T>(
  adminId: string,
  aal: "aal1" | "aal2",
  fn: (tx: DbTx) => Promise<T>
): Promise<T> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [adminId]);
    await tx.query("select set_config('request.jwt.claim.aal', $1, true)", [aal]);
    return fn(tx as unknown as DbTx);
  });
}

export async function withDbSuperuser<T>(fn: (tx: DbTx) => Promise<T>): Promise<T> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    return fn(tx as unknown as DbTx);
  });
}
