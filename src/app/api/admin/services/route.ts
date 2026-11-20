import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dedupeRequest, hashDedupePayload } from "@/lib/dedupe";
import { ProblemError, toProblemResponse } from "@/lib/errors";
import { assertUuid, readJsonBody } from "@/lib/http";
import { withApiTelemetry } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";
import { deleteAdminService, listAdminServicesAndPackages, upsertAdminService } from "@/modules/catalog/service";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("GET", "/api/admin/services", async () => {
    try {
      const admin = await requireAdmin("content");
      const data = await listAdminServicesAndPackages(admin);
      return NextResponse.json({ services: data.services }, { status: 200, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("POST", "/api/admin/services", async () => {
    try {
      const admin = await requireAdmin("content");
      const body = await readJsonBody(req);
      const saved = await dedupeRequest(
        `admin-service:${admin.adminId}:${hashDedupePayload(body)}`,
        () => upsertAdminService(admin, body)
      );
      return NextResponse.json(saved, { status: 201, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}

export async function DELETE(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("DELETE", "/api/admin/services", async () => {
    try {
      const admin = await requireAdmin("content");
      const rawId =
        req.nextUrl.searchParams.get("id") ||
        ((await readJsonBody(req).catch(() => ({}))) as { id?: string }).id;
      if (!rawId) {
        throw new ProblemError(400, "bad_request", "Missing service ID", "Specify an ID parameter to delete.");
      }
      const id = assertUuid(rawId, "service ID");
      await dedupeRequest(`admin-service-del:${id}`, () => deleteAdminService(admin, id));
      return NextResponse.json({ ok: true, id }, { status: 200, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}
