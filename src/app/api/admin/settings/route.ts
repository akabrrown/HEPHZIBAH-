import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dedupeRequest, hashDedupePayload } from "@/lib/dedupe";
import { toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { withApiTelemetry } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";
import { getAdminSiteSettings, updateAdminSiteSettings } from "@/modules/catalog/service";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("GET", "/api/admin/settings", async () => {
    try {
      const admin = await requireAdmin("settings");
      const settings = await getAdminSiteSettings(admin);
      return NextResponse.json(settings, { status: 200, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}

export async function PATCH(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("PATCH", "/api/admin/settings", async () => {
    try {
      const admin = await requireAdmin("settings");
      const body = await readJsonBody(req);
      const updated = await dedupeRequest(
        `admin-settings:${admin.adminId}:${hashDedupePayload(body)}`,
        () => updateAdminSiteSettings(admin, body)
      );
      return NextResponse.json(updated, { status: 200, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}
