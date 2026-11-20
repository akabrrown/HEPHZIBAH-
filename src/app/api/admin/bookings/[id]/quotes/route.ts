import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dedupeRequest, hashDedupePayload } from "@/lib/dedupe";
import { toProblemResponse } from "@/lib/errors";
import { assertUuid, readJsonBody } from "@/lib/http";
import { withApiTelemetry } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";
import { upsertDraftQuoteAdmin } from "@/modules/quoting/service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  return withApiTelemetry("POST", "/api/admin/bookings/[id]/quotes", async () => {
    try {
      const admin = await requireAdmin("bookings");
      const { id } = await context.params;
      const validId = assertUuid(id, "booking ID");
      const body = await readJsonBody(req);
      const quote = await dedupeRequest(
        `admin-quote:${validId}:${hashDedupePayload(body)}`,
        () => upsertDraftQuoteAdmin(admin, validId, body)
      );
      return NextResponse.json(quote, { status: 201, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  return withApiTelemetry("PATCH", "/api/admin/bookings/[id]/quotes", async () => {
    try {
      const admin = await requireAdmin("bookings");
      const { id } = await context.params;
      const validId = assertUuid(id, "booking ID");
      const body = await readJsonBody(req);
      const quote = await dedupeRequest(
        `admin-quote:${validId}:${hashDedupePayload(body)}`,
        () => upsertDraftQuoteAdmin(admin, validId, body)
      );
      return NextResponse.json(quote, { status: 200, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}
