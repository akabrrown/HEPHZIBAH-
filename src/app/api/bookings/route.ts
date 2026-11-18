import { NextRequest, NextResponse } from "next/server";
import { dedupeRequest } from "@/lib/dedupe";
import { ProblemError, toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { checkSlidingWindowLimit, getClientSourceKey } from "@/lib/rate-limit";
import { recordApiRequest } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";
import { submitBookingRequest } from "@/modules/booking/service";

export async function POST(req: NextRequest) {
  const start = performance.now();
  const requestId = generateRequestId();
  try {
    const source = getClientSourceKey(req.headers);
    const shortLimit = checkSlidingWindowLimit(`bookings:10m:${source}`, 5, 10 * 60_000);
    if (!shortLimit.allowed) {
      throw new ProblemError(
        429,
        "rate_limited",
        "Too many booking attempts",
        "Please wait a few minutes before sending another request, or message us directly on WhatsApp.",
        { headers: { "Retry-After": String(shortLimit.retryAfterSeconds) } }
      );
    }

    const dailyLimit = checkSlidingWindowLimit(`bookings:24h:${source}`, 20, 24 * 60 * 60_000);
    if (!dailyLimit.allowed) {
      throw new ProblemError(
        429,
        "rate_limited",
        "Daily booking limit reached",
        "You have reached the daily submission limit. Please contact our desk on WhatsApp.",
        { headers: { "Retry-After": String(dailyLimit.retryAfterSeconds) } }
      );
    }

    const body = await readJsonBody(req);
    const idempotencyKey = req.headers.get("idempotency-key");

    // Deduplicate concurrent identical submissions using idempotency key or client source + date
    const dedupeKey = idempotencyKey
      ? `booking-idem:${idempotencyKey}`
      : `booking-sub:${source}:${JSON.stringify(body).slice(0, 80)}`;

    const result = await dedupeRequest(dedupeKey, () =>
      submitBookingRequest(body, idempotencyKey)
    );

    recordApiRequest("POST", "/api/bookings", performance.now() - start);

    return NextResponse.json(
      {
        reference: result.reference,
        statusUrl: result.statusUrl,
        replay: result.isReplay,
      },
      {
        status: result.isReplay ? 200 : 201,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    recordApiRequest("POST", "/api/bookings", performance.now() - start);
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
