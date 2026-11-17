import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { generateRequestId } from "@/lib/tokens";
import { transitionBookingByAdmin } from "@/modules/booking/service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const admin = await requireAdmin("bookings");
    const { id } = await context.params;
    const body = await readJsonBody(req);
    const updated = await transitionBookingByAdmin(admin, id, body);
    return NextResponse.json(updated, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
