import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { toProblemResponse } from "@/lib/errors";
import { generateRequestId } from "@/lib/tokens";
import { getBookingDetailForAdmin, saveBookingGalleryDelivery } from "@/modules/booking/service";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const admin = await requireAdmin("bookings");
    const { id } = await context.params;
    const detail = await getBookingDetailForAdmin(admin, id);
    return NextResponse.json(detail, { status: 200, headers: { "Cache-Control": "no-store" } });
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
    const body = await req.json().catch(() => ({}));
    const updated = await saveBookingGalleryDelivery(admin, id, body);
    return NextResponse.json({ booking: updated }, { status: 200 });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
