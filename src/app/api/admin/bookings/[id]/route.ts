import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dedupeRequest, hashDedupePayload } from "@/lib/dedupe";
import { toProblemResponse } from "@/lib/errors";
import { assertUuid, readJsonBody } from "@/lib/http";
import { withApiTelemetry } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";
import { getBookingDetailForAdmin, saveBookingGalleryDelivery } from "@/modules/booking/service";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  return withApiTelemetry("GET", "/api/admin/bookings/[id]", async () => {
    try {
      const admin = await requireAdmin("bookings");
      const { id } = await context.params;
      const validId = assertUuid(id, "booking ID");
      const detail = await getBookingDetailForAdmin(admin, validId);
      return NextResponse.json(detail, { status: 200, headers: { "Cache-Control": "no-store" } });
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
  return withApiTelemetry("PATCH", "/api/admin/bookings/[id]", async () => {
    try {
      const admin = await requireAdmin("bookings");
      const { id } = await context.params;
      const validId = assertUuid(id, "booking ID");
      const body = await readJsonBody(req);
      const updated = await dedupeRequest(
        `admin-booking-gallery:${validId}:${hashDedupePayload(body)}`,
        () => saveBookingGalleryDelivery(admin, validId, body)
      );
      return NextResponse.json(
        { booking: updated },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}
