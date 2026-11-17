import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { generateRequestId } from "@/lib/tokens";
import { sendQuoteAdmin } from "@/modules/quoting/service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string; quoteId: string }> }
) {
  const requestId = generateRequestId();
  try {
    const admin = await requireAdmin("bookings");
    const { id, quoteId } = await context.params;
    const body = (await readJsonBody(req).catch(() => ({}))) as { validDays?: number };
    const sent = await sendQuoteAdmin(admin, id, quoteId, body?.validDays);
    return NextResponse.json(sent, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
