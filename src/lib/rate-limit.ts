import type { NextRequest } from "next/server";
import { ProblemError } from "@/lib/errors";

interface RateWindow {
  timestamps: number[];
}

const buckets = new Map<string, RateWindow>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkSlidingWindowLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
  nowMs: number = Date.now()
): RateLimitResult {
  const cutoff = nowMs - windowMs;
  const existing = buckets.get(key) ?? { timestamps: [] };
  const active = existing.timestamps.filter((ts) => ts > cutoff);

  if (active.length >= maxRequests) {
    const oldest = active[0] ?? nowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - nowMs) / 1000));
    buckets.set(key, { timestamps: active });
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  active.push(nowMs);
  buckets.set(key, { timestamps: active });
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - active.length),
    retryAfterSeconds: 0,
  };
}

export function resetRateLimitBuckets(): void {
  buckets.clear();
}

export function getClientSourceKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "127.0.0.1";
}

export function isHoneypotTriggered(honeypotValue: string | null | undefined): boolean {
  return typeof honeypotValue === "string" && honeypotValue.trim().length > 0;
}

const BANNED_BOT_SUBSTRINGS = [
  "sqlmap",
  "nikto",
  "masscan",
  "nmap",
  "acunetix",
  "havij",
  "dirbuster",
  "gobuster",
  "wprecon",
  "wp-scan",
  "censys",
  "shodan",
];

export function isBotOrMaliciousCrawler(userAgent: string | null | undefined): boolean {
  if (!userAgent || userAgent.trim().length === 0) {
    return true;
  }
  const lower = userAgent.toLowerCase();
  return BANNED_BOT_SUBSTRINGS.some((banned) => lower.includes(banned));
}

export interface ProtectEndpointOptions {
  keyPrefix: string;
  maxRequests: number;
  windowMs: number;
  blockBots?: boolean;
  customMessage?: string;
}

/**
 * Enforces bot rejection and sliding-window rate limits on expensive API endpoints.
 * Throws a structured ProblemError (403 for bots, 429 for rate limit exceeded).
 */
export function protectEndpoint(
  req: NextRequest,
  options: ProtectEndpointOptions
): void {
  const userAgent = req.headers.get("user-agent");
  if (options.blockBots !== false && isBotOrMaliciousCrawler(userAgent)) {
    throw new ProblemError(
      403,
      "bot_forbidden",
      "Automated scanner blocked",
      "Access denied by security bot policy."
    );
  }

  const source = getClientSourceKey(req.headers);
  const limit = checkSlidingWindowLimit(
    `${options.keyPrefix}:${source}`,
    options.maxRequests,
    options.windowMs
  );

  if (!limit.allowed) {
    throw new ProblemError(
      429,
      "rate_limited",
      "Too many requests",
      options.customMessage ?? "Please slow down and wait a few minutes before trying again.",
      { headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }
}
