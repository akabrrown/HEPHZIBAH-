import { NextRequest, NextResponse } from "next/server";
import { dedupeRequest } from "@/lib/dedupe";
import { toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { getClientSourceKey, protectEndpoint } from "@/lib/rate-limit";
import { recordApiRequest } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";
import { submitPublicEnquiry } from "@/modules/content-legal/service";

export async function POST(req: NextRequest) {
  const start = performance.now();
  const requestId = generateRequestId();
  try {
    protectEndpoint(req, {
      keyPrefix: "enquiries:10m",
      maxRequests: 3,
      windowMs: 10 * 60_000,
      customMessage: "Please wait a few minutes or message us directly on WhatsApp.",
    });

    const body = await readJsonBody(req);
    const source = getClientSourceKey(req.headers);
    const dedupeKey = `enquiry:${source}:${JSON.stringify(body).slice(0, 60)}`;

    const result = await dedupeRequest(dedupeKey, () => submitPublicEnquiry(body));

    recordApiRequest("POST", "/api/enquiries", performance.now() - start);

    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    recordApiRequest("POST", "/api/enquiries", performance.now() - start);
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
