import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { toProblemResponse } from "@/lib/errors";
import { generateRequestId } from "@/lib/tokens";
import { reviseQuoteAdmin } from "@/modules/quoting/service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string; quoteId: string }> }
) {
  const requestId = generateRequestId();
  try {
    const admin = await requireAdmin("bookings");
    const { id, quoteId } = await context.params;
    const revised = await reviseQuoteAdmin(admin, id, quoteId);
    return NextResponse.json(revised, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
