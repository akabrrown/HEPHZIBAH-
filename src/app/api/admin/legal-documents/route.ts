import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dedupeRequest, hashDedupePayload } from "@/lib/dedupe";
import { toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { withApiTelemetry } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";
import {
  listAdminLegalDocuments,
  publishAdminLegalDocument,
} from "@/modules/content-legal/service";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("GET", "/api/admin/legal-documents", async () => {
    try {
      const admin = await requireAdmin("settings");
      const documents = await listAdminLegalDocuments(admin);
      return NextResponse.json({ documents }, { status: 200, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("POST", "/api/admin/legal-documents", async () => {
    try {
      const admin = await requireAdmin("settings");
      const body = await readJsonBody(req);
      const doc = await dedupeRequest(
        `admin-legal:${admin.adminId}:${hashDedupePayload(body)}`,
        () => publishAdminLegalDocument(admin, body)
      );
      return NextResponse.json(doc, { status: 201, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}
