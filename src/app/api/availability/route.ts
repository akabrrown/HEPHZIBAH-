import { NextRequest, NextResponse } from "next/server";
import { dedupeRequest } from "@/lib/dedupe";
import { toProblemResponse } from "@/lib/errors";
import { protectEndpoint } from "@/lib/rate-limit";
import { recordApiRequest } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";
import { getPublicUnavailableDates } from "@/modules/booking/service";

export async function GET(req: NextRequest) {
  const start = performance.now();
  const requestId = generateRequestId();
  try {
    protectEndpoint(req, {
      keyPrefix: "availability:5m",
      maxRequests: 60,
      windowMs: 5 * 60_000,
      customMessage: "Please wait before checking availability again.",
    });

    const from = req.nextUrl.searchParams.get("from") ?? undefined;
    const to = req.nextUrl.searchParams.get("to") ?? undefined;

    // Deduplicate in-flight concurrent availability queries for identical date ranges
    const dedupeKey = `avail:${from ?? "all"}:${to ?? "all"}`;
    const data = await dedupeRequest(dedupeKey, () => getPublicUnavailableDates(from, to));

    recordApiRequest("GET", "/api/availability", performance.now() - start);

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    recordApiRequest("GET", "/api/availability", performance.now() - start);
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
