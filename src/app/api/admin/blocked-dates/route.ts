import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { addDaysIso, getAccraTodayIso } from "@/lib/dates";
import { ProblemError, toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { generateRequestId } from "@/lib/tokens";
import {
  addBlockedDateAdmin,
  getCalendarAndBlockedDatesAdmin,
  removeBlockedDateAdmin,
} from "@/modules/booking/service";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const admin = await requireAdmin("bookings");
    const today = getAccraTodayIso();
    const from = req.nextUrl.searchParams.get("from") ?? today;
    const to = req.nextUrl.searchParams.get("to") ?? addDaysIso(from, 90);
    const data = await getCalendarAndBlockedDatesAdmin(admin, from, to);
    return NextResponse.json(data, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const admin = await requireAdmin("bookings");
    const body = await readJsonBody(req);
    const created = await addBlockedDateAdmin(admin, body);
    return NextResponse.json(created, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}

export async function DELETE(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const admin = await requireAdmin("bookings");
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      throw new ProblemError(422, "validation_error", "Missing blocked date ID", "Pass ?id=<uuid>.");
    }
    await removeBlockedDateAdmin(admin, id);
    return NextResponse.json({ ok: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
