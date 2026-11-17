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
