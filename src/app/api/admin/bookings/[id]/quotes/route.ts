import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { generateRequestId } from "@/lib/tokens";
import { upsertDraftQuoteAdmin } from "@/modules/quoting/service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const admin = await requireAdmin("bookings");
    const { id } = await context.params;
    const body = await readJsonBody(req);
    const quote = await upsertDraftQuoteAdmin(admin, id, body);
    return NextResponse.json(quote, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const admin = await requireAdmin("bookings");
    const { id } = await context.params;
    const body = await readJsonBody(req);
    const quote = await upsertDraftQuoteAdmin(admin, id, body);
    return NextResponse.json(quote, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
