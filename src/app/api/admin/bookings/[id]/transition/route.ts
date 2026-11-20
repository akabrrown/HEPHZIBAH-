import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dedupeRequest, hashDedupePayload } from "@/lib/dedupe";
import { toProblemResponse } from "@/lib/errors";
import { assertUuid, readJsonBody } from "@/lib/http";
import { withApiTelemetry } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";
import { transitionBookingByAdmin } from "@/modules/booking/service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  return withApiTelemetry("POST", "/api/admin/bookings/[id]/transition", async () => {
    try {
      const admin = await requireAdmin("bookings");
      const { id } = await context.params;
      const validId = assertUuid(id, "booking ID");
      const body = await readJsonBody(req);
      const updated = await dedupeRequest(
        `admin-transition:${validId}:${hashDedupePayload(body)}`,
        () => transitionBookingByAdmin(admin, validId, body)
      );
      return NextResponse.json(updated, { status: 200, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}
