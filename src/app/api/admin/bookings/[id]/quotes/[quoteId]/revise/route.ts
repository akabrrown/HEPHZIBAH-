import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dedupeRequest } from "@/lib/dedupe";
import { toProblemResponse } from "@/lib/errors";
import { assertUuid } from "@/lib/http";
import { withApiTelemetry } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";
import { reviseQuoteAdmin } from "@/modules/quoting/service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string; quoteId: string }> }
) {
  const requestId = generateRequestId();
  return withApiTelemetry("POST", "/api/admin/bookings/[id]/quotes/[quoteId]/revise", async () => {
    try {
      const admin = await requireAdmin("bookings");
      const { id, quoteId } = await context.params;
      const validId = assertUuid(id, "booking ID");
      const validQuoteId = assertUuid(quoteId, "quote ID");
      const revised = await dedupeRequest(`admin-quote-revise:${validQuoteId}`, () =>
        reviseQuoteAdmin(admin, validId, validQuoteId)
      );
      return NextResponse.json(revised, { status: 201, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}
