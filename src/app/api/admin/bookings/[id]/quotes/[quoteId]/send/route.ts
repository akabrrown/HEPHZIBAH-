import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dedupeRequest, hashDedupePayload } from "@/lib/dedupe";
import { toProblemResponse } from "@/lib/errors";
import { assertUuid, readJsonBody } from "@/lib/http";
import { withApiTelemetry } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";
import { sendQuoteAdmin } from "@/modules/quoting/service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string; quoteId: string }> }
) {
  const requestId = generateRequestId();
  return withApiTelemetry("POST", "/api/admin/bookings/[id]/quotes/[quoteId]/send", async () => {
    try {
      const admin = await requireAdmin("bookings");
      const { id, quoteId } = await context.params;
      const validId = assertUuid(id, "booking ID");
      const validQuoteId = assertUuid(quoteId, "quote ID");
      const body = (await readJsonBody(req).catch(() => ({}))) as { validDays?: number };
      const sent = await dedupeRequest(
        `admin-quote-send:${validQuoteId}:${hashDedupePayload(body)}`,
        () => sendQuoteAdmin(admin, validId, validQuoteId, body?.validDays)
      );
      return NextResponse.json(sent, { status: 200, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}
