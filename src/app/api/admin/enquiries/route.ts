import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dedupeRequest, hashDedupePayload } from "@/lib/dedupe";
import { toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { withApiTelemetry } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";
import { enquiryStatusValues, type EnquiryStatus } from "@/modules/content-legal/schema";
import { listAdminEnquiries, updateAdminEnquiryStatus } from "@/modules/content-legal/service";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("GET", "/api/admin/enquiries", async () => {
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
  });
}

export async function PATCH(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("PATCH", "/api/admin/enquiries", async () => {
    try {
      const admin = await requireAdmin("bookings");
      const body = await readJsonBody(req);
      const updated = await dedupeRequest(
        `admin-enquiry:${admin.adminId}:${hashDedupePayload(body)}`,
        () => updateAdminEnquiryStatus(admin, body)
      );
      return NextResponse.json(updated, { status: 200, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}
