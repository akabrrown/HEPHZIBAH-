import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { EMBEDDED_SQL_FILES } from "@/lib/schema-sql";
import { recordDbQuery } from "@/lib/telemetry";
import {
  DEFAULT_AKAYETB_ADMIN_ID,
  DEFAULT_BOOKINGS_ADMIN_ID,
  DEFAULT_CONTENT_ADMIN_ID,
  DEFAULT_OWNER_ID,
  EXTRA_SEED_SQL,
  SEED_ADMIN_PASSWORD,
  SEED_AKAYETB_TOTP_SECRET,
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
  try {
    const fullPath = path.join(process.cwd(), relativePath);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, "utf8");
    }
  } catch {
    // Fall through to embedded SQL in serverless/sandboxed environments
  }

  const normalized = relativePath.replace(/\\/g, "/");
  const embedded = EMBEDDED_SQL_FILES[normalized];
  if (embedded) {
    return embedded;
  }
  throw new Error(`SQL file not found on disk or embedded: ${relativePath}`);
}

async function seedDefaultAdmins(pg: PGlite): Promise<void> {
  const defaultPasswordHash = hashScryptLocal(SEED_ADMIN_PASSWORD);
  const akayetPasswordHash = hashScryptLocal("Option#5");

  const admins = [
    {
      id: DEFAULT_AKAYETB_ADMIN_ID,
      email: "akayetb@gmail.com",
      displayName: "Akayet B",
      totpSecret: SEED_AKAYETB_TOTP_SECRET,
      scopes: ["bookings", "content", "settings", "team"],
      passwordHash: akayetPasswordHash,
    },
    {
      id: DEFAULT_OWNER_ID,
      email: "owner@hephzibahmedia.com",
      displayName: "Kofi Mensah (Owner)",
      totpSecret: SEED_OWNER_TOTP_SECRET,
      scopes: ["bookings", "content", "settings", "team"],
      passwordHash: defaultPasswordHash,
    },
    {
      id: DEFAULT_CONTENT_ADMIN_ID,
      email: "content@hephzibahmedia.com",
      displayName: "Ama Boateng (Content)",
      totpSecret: SEED_CONTENT_TOTP_SECRET,
      scopes: ["content"],
      passwordHash: defaultPasswordHash,
    },
    {
      id: DEFAULT_BOOKINGS_ADMIN_ID,
      email: "bookings@hephzibahmedia.com",
      displayName: "Yaw Darko (Bookings)",
      totpSecret: SEED_BOOKINGS_TOTP_SECRET,
      scopes: ["bookings"],
      passwordHash: defaultPasswordHash,
    },
  ];

  for (const admin of admins) {
    await pg.query(
      `insert into auth.users (id, email, password_hash, totp_secret)
       values ($1, $2, $3, $4)
       on conflict (id) do update
         set email = excluded.email,
             password_hash = excluded.password_hash,
             totp_secret = excluded.totp_secret`,
      [admin.id, admin.email, admin.passwordHash, admin.totpSecret]
    );
    await pg.query(
      `insert into admin_users (id, email, password_hash, totp_secret, display_name, scopes, is_active)
       values ($1, $2, $3, $4, $5, $6, true)
       on conflict (id) do update
         set email = excluded.email,
             password_hash = excluded.password_hash,
             totp_secret = excluded.totp_secret,
             display_name = excluded.display_name,
             scopes = excluded.scopes,
             is_active = true`,
      [admin.id, admin.email, admin.passwordHash, admin.totpSecret, admin.displayName, admin.scopes]
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
      alter table admin_users
        add column if not exists email text,
        add column if not exists password_hash text,
        add column if not exists totp_secret text;

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
    await seedDefaultAdmins(pg);
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
  await pg.exec(`
    alter table admin_users
      add column if not exists email text,
      add column if not exists password_hash text,
      add column if not exists totp_secret text;
  `);
  await pg.exec(POST_SCHEMA_ROLE_GRANTS_SQL);

  const seedSql = readSqlFile("supabase/seed.sql");
  await pg.exec(seedSql);
  await pg.exec(EXTRA_SEED_SQL);
  await seedDefaultAdmins(pg);
}

declare global {
  var __hephzibahPgPromise: Promise<PGlite> | undefined;
  var __hephzibahPgPool: Pool | undefined;
}

function resolvePgliteDataDir(): string {
  const configured = process.env.PGLITE_DATA_DIR?.trim();
  if (configured) {
    return configured;
  }
  if (process.env.NODE_ENV === "test") {
    return "memory://";
  }
  // Vercel / AWS Lambda serverless read-only filesystem check
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDir = path.join(os.tmpdir(), "pglite-hephzibah");
    try {
      fs.mkdirSync(tmpDir, { recursive: true });
      return tmpDir;
    } catch {
      return "memory://";
    }
  }
  try {
    const dir = path.join(process.cwd(), ".pglite", "hephzibah");
    fs.mkdirSync(path.dirname(dir), { recursive: true });
    return dir;
  } catch {
    // If process.cwd() is read-only, safely fall back to OS temp dir
    try {
      const tmpDir = path.join(os.tmpdir(), "pglite-hephzibah");
      fs.mkdirSync(tmpDir, { recursive: true });
      return tmpDir;
    } catch {
      return "memory://";
    }
  }
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

function wrapInstrumentedTx(tx: DbTx): DbTx {
  return {
    async query<T = Record<string, unknown>>(
      text: string,
      params?: unknown[]
    ): Promise<DbQueryResult<T>> {
      const start = performance.now();
      try {
        return await tx.query<T>(text, params);
      } finally {
        const durationMs = performance.now() - start;
        recordDbQuery(text, durationMs);
      }
    },
    async exec(sql: string): Promise<unknown> {
      const start = performance.now();
      try {
        return await tx.exec(sql);
      } finally {
        const durationMs = performance.now() - start;
        recordDbQuery(sql, durationMs);
      }
    },
  };
}

function shouldUsePostgresPool(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.NODE_ENV !== "test");
}

function getPgPool(): Pool {
  if (!globalThis.__hephzibahPgPool) {
    const connectionString = process.env.DATABASE_URL;
    globalThis.__hephzibahPgPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return globalThis.__hephzibahPgPool;
}

async function runWithPoolTx<T>(
  setup: (client: PoolClient) => Promise<void>,
  fn: (tx: DbTx) => Promise<T>
): Promise<T> {
  const pool = getPgPool();
  const client = await pool.connect();
  let pending: Promise<unknown> = Promise.resolve();
  const enqueue = <R>(work: () => Promise<R>): Promise<R> => {
    const next = pending.then(work, work);
    pending = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  };
  try {
    await client.query("BEGIN");
    await setup(client);
    const txAdapter: DbTx = {
      query<R = Record<string, unknown>>(
        text: string,
        params?: unknown[]
      ): Promise<DbQueryResult<R>> {
        return enqueue(async () => {
          const res = await client.query(text, params);
          return {
            rows: res.rows as R[],
            affectedRows: res.rowCount ?? undefined,
          };
        });
      },
      exec(sql: string): Promise<unknown> {
        return enqueue(() => client.query(sql));
      },
    };
    const result = await fn(wrapInstrumentedTx(txAdapter));
    await pending;
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await pending;
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback failure
    }
    throw err;
  } finally {
    client.release();
  }
}

export function getDbConnectionStatus(): {
  isInitialized: boolean;
  engine: "pglite" | "postgres";
  reusedSingleton: boolean;
} {
  if (shouldUsePostgresPool()) {
    return {
      isInitialized: Boolean(globalThis.__hephzibahPgPool),
      engine: "postgres",
      reusedSingleton: true,
    };
  }
  return {
    isInitialized: Boolean(globalThis.__hephzibahPgPromise),
    engine: "pglite",
    reusedSingleton: true,
  };
}

export async function withServiceRole<T>(fn: (tx: DbTx) => Promise<T>): Promise<T> {
  if (shouldUsePostgresPool()) {
    return runWithPoolTx(async (client) => {
      await client.query("set local role service_role");
    }, fn);
  }
  const db = await getDb();
  return db.transaction(async (tx) => {
    await tx.exec("set local role service_role");
    return fn(wrapInstrumentedTx(tx as unknown as DbTx));
  });
}

export async function withAnonRole<T>(fn: (tx: DbTx) => Promise<T>): Promise<T> {
  if (shouldUsePostgresPool()) {
    return runWithPoolTx(async (client) => {
      await client.query("set local role anon");
    }, fn);
  }
  const db = await getDb();
  return db.transaction(async (tx) => {
    await tx.exec("set local role anon");
    return fn(wrapInstrumentedTx(tx as unknown as DbTx));
  });
}

export async function withAdminRole<T>(
  adminId: string,
  aal: "aal1" | "aal2",
  fn: (tx: DbTx) => Promise<T>
): Promise<T> {
  const jwtClaims = JSON.stringify({ sub: adminId, aal, role: "authenticated" });
  if (shouldUsePostgresPool()) {
    return runWithPoolTx(async (client) => {
      await client.query("set local role authenticated");
      await client.query("select set_config('request.jwt.claim.sub', $1, true)", [adminId]);
      await client.query("select set_config('request.jwt.claim.aal', $1, true)", [aal]);
      await client.query("select set_config('request.jwt.claims', $1, true)", [jwtClaims]);
    }, fn);
  }
  const db = await getDb();
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [adminId]);
    await tx.query("select set_config('request.jwt.claim.aal', $1, true)", [aal]);
    await tx.query("select set_config('request.jwt.claims', $1, true)", [jwtClaims]);
    return fn(wrapInstrumentedTx(tx as unknown as DbTx));
  });
}

export async function withDbSuperuser<T>(fn: (tx: DbTx) => Promise<T>): Promise<T> {
  if (shouldUsePostgresPool()) {
    return runWithPoolTx(async () => {}, fn);
  }
  const db = await getDb();
  return db.transaction(async (tx) => {
    return fn(wrapInstrumentedTx(tx as unknown as DbTx));
  });
}
