import crypto from "node:crypto";
import { getTokenPepper } from "@/lib/env";

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateBookingReference(now: Date = new Date()): string {
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const bytes = crypto.randomBytes(5);
  let suffix = "";
  for (let i = 0; i < 5; i++) {
    const byte = bytes[i] ?? 0;
    suffix += REF_ALPHABET[byte % REF_ALPHABET.length] ?? "K";
  }
  return `HM-${yy}${mm}-${suffix}`;
}

export function generateAccessToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashAccessToken(rawToken: string): string {
  return crypto
    .createHmac("sha256", getTokenPepper())
    .update(rawToken.trim())
    .digest("hex");
}

export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function generateRequestId(): string {
  return `req_${crypto.randomBytes(6).toString("hex")}`;
}
