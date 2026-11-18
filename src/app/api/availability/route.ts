import { NextRequest, NextResponse } from "next/server";
import { ProblemError, toProblemResponse } from "@/lib/errors";
import { checkSlidingWindowLimit, getClientSourceKey, isBotOrMaliciousCrawler } from "@/lib/rate-limit";
import { generateRequestId } from "@/lib/tokens";
import { getPublicUnavailableDates } from "@/modules/booking/service";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const userAgent = req.headers.get("user-agent");
    if (isBotOrMaliciousCrawler(userAgent)) {
      throw new ProblemError(403, "forbidden", "Access denied", "Automated scrapers are not permitted.");
    }

    const source = getClientSourceKey(req.headers);
    const limit = checkSlidingWindowLimit(`availability:5m:${source}`, 60, 5 * 60_000);
    if (!limit.allowed) {
      throw new ProblemError(429, "rate_limited", "Too many requests", "Please wait before checking availability again.", {
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      });
    }

    const from = req.nextUrl.searchParams.get("from") ?? undefined;
    const to = req.nextUrl.searchParams.get("to") ?? undefined;
    const data = await getPublicUnavailableDates(from, to);
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        "X-RateLimit-Remaining": String(limit.remaining),
      },
    });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
