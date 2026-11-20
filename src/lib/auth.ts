import crypto from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { getServerEnv, getSessionSecret } from "@/lib/env";
import { ProblemError } from "@/lib/errors";
import { safeCompare } from "@/lib/tokens";
import { withServiceRole } from "@/lib/db";

export type AdminScope = "bookings" | "content" | "settings" | "team";
export type AuthAal = "aal1" | "aal2";

export const ADMIN_SESSION_COOKIE = "hm_admin_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 hours inactivity / session lifetime
const MAX_REVOKED_JTIS = 5000;
const MAX_TOTP_TRACKED_ADMINS = 1000;

declare global {
  var __hephzibahRevokedJtis: Map<string, number> | undefined;
  var __hephzibahLastTotpStep: Map<string, number> | undefined;
}

function getRevokedJtiStore(): Map<string, number> {
  if (!globalThis.__hephzibahRevokedJtis) {
    globalThis.__hephzibahRevokedJtis = new Map<string, number>();
  }
  return globalThis.__hephzibahRevokedJtis;
}

function getLastTotpStepStore(): Map<string, number> {
  if (!globalThis.__hephzibahLastTotpStep) {
    globalThis.__hephzibahLastTotpStep = new Map<string, number>();
  }
  return globalThis.__hephzibahLastTotpStep;
}

export function revokeSessionJti(jti: string, expUnixSeconds: number): void {
  if (!jti) return;
  const store = getRevokedJtiStore();
  const nowSec = Math.floor(Date.now() / 1000);
  if (store.size >= MAX_REVOKED_JTIS) {
    for (const [k, exp] of store.entries()) {
      if (exp < nowSec) store.delete(k);
    }
    while (store.size >= MAX_REVOKED_JTIS) {
      const oldest = store.keys().next().value;
      if (!oldest) break;
      store.delete(oldest);
    }
  }
  store.set(jti, expUnixSeconds);
}

export function isSessionJtiRevoked(jti: string): boolean {
  const store = getRevokedJtiStore();
  const exp = store.get(jti);
  if (exp === undefined) return false;
  if (exp < Math.floor(Date.now() / 1000)) {
    store.delete(jti);
    return false;
  }
  return true;
}

export interface AdminSessionPayload {
  adminId: string;
  email: string;
  displayName: string;
  scopes: AdminScope[];
  aal: AuthAal;
  exp: number;
  jti: string;
}

export function hashPassword(password: string): string {
  if (password.length < 8 || password.length > 128) {
    throw new ProblemError(
      422,
      "invalid_password",
      "Invalid password length",
      "Password must be between 8 and 128 characters."
    );
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (password.length < 1 || password.length > 128) return false;
  const parts = storedHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = parts[1];
  const expected = parts[2];
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex");
  return safeCompare(actual, expected);
}

export async function isPasswordBreached(password: string): Promise<boolean> {
  if (getServerEnv().NODE_ENV === "test") return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const sha1 = crypto.createHash("sha1").update(password).digest("hex").toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const text = await response.text();
    return text.split("\n").some((line) => line.startsWith(`${suffix}:`));
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function decodeBase32(secret: string): Buffer {
  const clean = secret.replace(/[\s=]/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = BASE32_CHARS.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateTotpCode(secretBase32: string, timestampMs: number = Date.now()): string {
  const counter = Math.floor(timestampMs / 1000 / 30);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const key = decodeBase32(secretBase32);
  const hmac = crypto.createHmac("sha1", key).update(counterBuf).digest();
  const offset = (hmac[hmac.length - 1] ?? 0) & 0x0f;
  const binCode =
    (((hmac[offset] ?? 0) & 0x7f) << 24) |
    (((hmac[offset + 1] ?? 0) & 0xff) << 16) |
    (((hmac[offset + 2] ?? 0) & 0xff) << 8) |
    ((hmac[offset + 3] ?? 0) & 0xff);
  const otp = binCode % 1_000_000;
  return String(otp).padStart(6, "0");
}

export function verifyTotpCodeWithStep(
  secretBase32: string,
  code: string,
  timestampMs: number = Date.now()
): { valid: boolean; step: number } {
  const normalized = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalized)) return { valid: false, step: 0 };
  const baseStep = Math.floor(timestampMs / 1000 / 30);
  for (const drift of [-1, 0, 1]) {
    const stepMs = timestampMs + drift * 30_000;
    const candidate = generateTotpCode(secretBase32, stepMs);
    if (safeCompare(candidate, normalized)) {
      return { valid: true, step: baseStep + drift };
    }
  }
  return { valid: false, step: 0 };
}

export function verifyTotpCode(
  secretBase32: string,
  code: string,
  timestampMs: number = Date.now()
): boolean {
  return verifyTotpCodeWithStep(secretBase32, code, timestampMs).valid;
}

export function claimTotpStep(adminId: string, step: number): boolean {
  const store = getLastTotpStepStore();
  const last = store.get(adminId);
  if (last !== undefined && step <= last) {
    return false;
  }
  if (store.size >= MAX_TOTP_TRACKED_ADMINS) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(adminId, step);
  return true;
}

export function signSessionToken(payload: AdminSessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", getSessionSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string): AdminSessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;
  const expectedSig = crypto
    .createHmac("sha256", getSessionSecret())
    .update(body)
    .digest("base64url");
  if (!safeCompare(sig, expectedSig)) return null;
  try {
    const decoded = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as AdminSessionPayload;
    if (!decoded.adminId || !decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    if (decoded.jti && isSessionJtiRevoked(decoded.jti)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export function createSessionCookieOptions(maxAgeSeconds = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!rawCookie) return null;
  return verifySessionToken(rawCookie);
}

const loadAdminRecordCached = cache(async (adminId: string) => {
  return withServiceRole(async (tx) => {
    const res = await tx.query<{
      id: string;
      display_name: string;
      scopes: AdminScope[];
      is_active: boolean;
    }>(
      `select id, display_name, scopes, is_active from admin_users where id = $1`,
      [adminId]
    );
    return res.rows[0] ?? null;
  });
});

export async function requireAdmin(requiredScope?: AdminScope): Promise<AdminSessionPayload> {
  const session = await getAdminSession();
  if (!session) {
    throw new ProblemError(401, "unauthorized", "Sign in required", "Please sign in to the admin desk.");
  }
  if (session.aal !== "aal2") {
    throw new ProblemError(
      403,
      "mfa_required",
      "Two-factor verification required",
      "Please enter your authenticator code before opening admin data."
    );
  }

  const dbAdmin = await loadAdminRecordCached(session.adminId);

  if (!dbAdmin || !dbAdmin.is_active) {
    throw new ProblemError(
      403,
      "forbidden",
      "Access revoked",
      "This admin account is inactive."
    );
  }

  if (requiredScope && !dbAdmin.scopes.includes(requiredScope)) {
    throw new ProblemError(
      403,
      "forbidden",
      "Permission denied",
      `This account lacks the ${requiredScope} scope.`
    );
  }

  return {
    ...session,
    displayName: dbAdmin.display_name,
    scopes: dbAdmin.scopes,
  };
}
