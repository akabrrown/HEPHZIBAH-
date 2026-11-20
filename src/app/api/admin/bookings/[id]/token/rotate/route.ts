import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dedupeRequest } from "@/lib/dedupe";
import { toProblemResponse } from "@/lib/errors";
import { assertUuid } from "@/lib/http";
import { withApiTelemetry } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";
import { rotateBookingTokenByAdmin } from "@/modules/booking/service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  return withApiTelemetry("POST", "/api/admin/bookings/[id]/token/rotate", async () => {
    try {
      const admin = await requireAdmin("bookings");
      const { id } = await context.params;
      const validId = assertUuid(id, "booking ID");
      const result = await dedupeRequest(`admin-token-rotate:${validId}`, () =>
        rotateBookingTokenByAdmin(admin, validId)
      );
      return NextResponse.json(result, { status: 200, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}
