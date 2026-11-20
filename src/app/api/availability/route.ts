import { NextRequest, NextResponse } from "next/server";
import { dedupeRequest } from "@/lib/dedupe";
import { toProblemResponse } from "@/lib/errors";
import { assertIsoDate } from "@/lib/http";
import { protectEndpoint } from "@/lib/rate-limit";
import { withApiTelemetry } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";
import { getPublicUnavailableDates } from "@/modules/booking/service";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("GET", "/api/availability", async () => {
    try {
      protectEndpoint(req, {
        keyPrefix: "availability:5m",
        maxRequests: 60,
        windowMs: 5 * 60_000,
        customMessage: "Please wait before checking availability again.",
      });

      const fromRaw = req.nextUrl.searchParams.get("from");
      const toRaw = req.nextUrl.searchParams.get("to");
      const from = fromRaw ? assertIsoDate(fromRaw, "from date") : undefined;
      const to = toRaw ? assertIsoDate(toRaw, "to date") : undefined;

      const dedupeKey = `avail:${from ?? "all"}:${to ?? "all"}`;
      const data = await dedupeRequest(dedupeKey, () => getPublicUnavailableDates(from, to));

      return NextResponse.json(data, {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
        },
      });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}
