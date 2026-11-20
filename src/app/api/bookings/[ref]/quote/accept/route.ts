import { NextRequest, NextResponse } from "next/server";
import { dedupeRequest, hashDedupePayload } from "@/lib/dedupe";
import { ProblemError, toProblemResponse } from "@/lib/errors";
import { extractBearerOrQueryToken, readJsonBody } from "@/lib/http";
import { checkSlidingWindowLimit, getClientSourceKey } from "@/lib/rate-limit";
import { withApiTelemetry } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";
import { acceptQuoteByClient } from "@/modules/quoting/service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ ref: string }> }
) {
  const requestId = generateRequestId();
  return withApiTelemetry("POST", "/api/bookings/[ref]/quote/accept", async () => {
    try {
      const { ref } = await context.params;
      const source = getClientSourceKey(req.headers);
      const ipLimit = checkSlidingWindowLimit(`token-ip:${source}`, 30, 10 * 60_000);
      if (!ipLimit.allowed) {
        throw new ProblemError(
          429,
          "rate_limited",
          "Too many attempts",
          "Wait a few minutes before retrying.",
          { headers: { "Retry-After": String(ipLimit.retryAfterSeconds) } }
        );
      }
      const limit = checkSlidingWindowLimit(`token:${ref}:${source}`, 10, 10 * 60_000);
      if (!limit.allowed) {
        throw new ProblemError(
          429,
          "rate_limited",
          "Too many attempts",
          "Wait a few minutes before retrying.",
          { headers: { "Retry-After": String(limit.retryAfterSeconds) } }
        );
      }

      const token = extractBearerOrQueryToken(req);
      const body = await readJsonBody(req);
      const result = await dedupeRequest(
        `quote-accept:${ref}:${hashDedupePayload(body)}`,
        () => acceptQuoteByClient(ref, token, body)
      );
      return NextResponse.json(result, {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "Referrer-Policy": "no-referrer",
          "X-Robots-Tag": "noindex, nofollow",
        },
      });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}
