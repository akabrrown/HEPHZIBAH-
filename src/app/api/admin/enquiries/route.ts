import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { generateRequestId } from "@/lib/tokens";
import { enquiryStatusValues, type EnquiryStatus } from "@/modules/content-legal/schema";
import { listAdminEnquiries, updateAdminEnquiryStatus } from "@/modules/content-legal/service";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const admin = await requireAdmin("bookings");
    const statusParam = req.nextUrl.searchParams.get("status");
    const status =
      statusParam && enquiryStatusValues.includes(statusParam as EnquiryStatus)
        ? (statusParam as EnquiryStatus)
        : undefined;
    const items = await listAdminEnquiries(admin, status);
    return NextResponse.json({ items }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}

export async function PATCH(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const admin = await requireAdmin("bookings");
    const body = await readJsonBody(req);
    const updated = await updateAdminEnquiryStatus(admin, body);
    return NextResponse.json(updated, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
