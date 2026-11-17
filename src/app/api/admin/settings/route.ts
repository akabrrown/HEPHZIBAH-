import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { generateRequestId } from "@/lib/tokens";
import { getPublicSiteSettings, updateAdminSiteSettings } from "@/modules/catalog/service";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    await requireAdmin("settings");
    const settings = await getPublicSiteSettings();
    return NextResponse.json(settings, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}

export async function PATCH(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const admin = await requireAdmin("settings");
    const body = await readJsonBody(req);
    const updated = await updateAdminSiteSettings(admin, body);
    return NextResponse.json(updated, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
