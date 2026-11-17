import { NextRequest, NextResponse } from "next/server";
import { ProblemError, toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { checkSlidingWindowLimit, getClientSourceKey } from "@/lib/rate-limit";
import { generateRequestId } from "@/lib/tokens";
import { submitPublicEnquiry } from "@/modules/content-legal/service";

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const source = getClientSourceKey(req.headers);
    const limit = checkSlidingWindowLimit(`enquiries:10m:${source}`, 3, 10 * 60_000);
    if (!limit.allowed) {
      throw new ProblemError(
        429,
        "rate_limited",
        "Too many enquiries sent",
        "Please wait a few minutes or message us directly on WhatsApp.",
        { headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    const body = await readJsonBody(req);
    const result = await submitPublicEnquiry(body);
    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
