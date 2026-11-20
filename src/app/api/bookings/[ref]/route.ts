import { NextRequest, NextResponse } from "next/server";
import { ProblemError, toProblemResponse } from "@/lib/errors";
import { extractBearerOrQueryToken } from "@/lib/http";
import { checkSlidingWindowLimit, getClientSourceKey } from "@/lib/rate-limit";
import { withApiTelemetry } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";
import { getClientBookingStatus } from "@/modules/booking/service";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ ref: string }> }
) {
  const requestId = generateRequestId();
  return withApiTelemetry("GET", "/api/bookings/[ref]", async () => {
    try {
      const { ref } = await context.params;
      const source = getClientSourceKey(req.headers);
      const ipLimit = checkSlidingWindowLimit(`token-ip:${source}`, 30, 10 * 60_000);
      if (!ipLimit.allowed) {
        throw new ProblemError(
          429,
          "rate_limited",
          "Too many status checks",
          "Please wait a few minutes and try again.",
          { headers: { "Retry-After": String(ipLimit.retryAfterSeconds) } }
        );
      }
      const limit = checkSlidingWindowLimit(`token:${ref}:${source}`, 10, 10 * 60_000);
      if (!limit.allowed) {
        throw new ProblemError(
          429,
          "rate_limited",
          "Too many status checks",
          "Please wait a few minutes and try again.",
          { headers: { "Retry-After": String(limit.retryAfterSeconds) } }
        );
      }

      const token = extractBearerOrQueryToken(req);
      const statusView = await getClientBookingStatus(ref, token);
      if (!statusView) {
        throw new ProblemError(
          404,
          "not_found",
          "Booking status link invalid",
          "Link not valid or expired. Contact the studio with your reference."
        );
      }

      return NextResponse.json(statusView, {
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
