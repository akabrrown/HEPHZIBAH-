import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { addDaysIso, getAccraTodayIso } from "@/lib/dates";
import { dedupeRequest, hashDedupePayload } from "@/lib/dedupe";
import { ProblemError, toProblemResponse } from "@/lib/errors";
import { assertIsoDate, assertUuid, readJsonBody } from "@/lib/http";
import { withApiTelemetry } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";
import {
  addBlockedDateAdmin,
  getCalendarAndBlockedDatesAdmin,
  removeBlockedDateAdmin,
} from "@/modules/booking/service";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("GET", "/api/admin/blocked-dates", async () => {
    try {
      const admin = await requireAdmin("bookings");
      const today = getAccraTodayIso();
      const fromParam = req.nextUrl.searchParams.get("from");
      const toParam = req.nextUrl.searchParams.get("to");
      const from = fromParam ? assertIsoDate(fromParam, "from date") : today;
      const to = toParam ? assertIsoDate(toParam, "to date") : addDaysIso(from, 90);
      const data = await getCalendarAndBlockedDatesAdmin(admin, from, to);
      return NextResponse.json(data, { status: 200, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("POST", "/api/admin/blocked-dates", async () => {
    try {
      const admin = await requireAdmin("bookings");
      const body = await readJsonBody(req);
      const created = await dedupeRequest(
        `admin-blocked-date:${admin.adminId}:${hashDedupePayload(body)}`,
        () => addBlockedDateAdmin(admin, body)
      );
      return NextResponse.json(created, { status: 201, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}

export async function DELETE(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("DELETE", "/api/admin/blocked-dates", async () => {
    try {
      const admin = await requireAdmin("bookings");
      const id = req.nextUrl.searchParams.get("id");
      if (!id) {
        throw new ProblemError(422, "validation_error", "Missing blocked date ID", "Pass ?id=<uuid>.");
      }
      const validId = assertUuid(id, "blocked date ID");
      await dedupeRequest(`admin-blocked-date-del:${validId}`, () =>
        removeBlockedDateAdmin(admin, validId)
      );
      return NextResponse.json({ ok: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}
