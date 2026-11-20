import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dedupeRequest, hashDedupePayload } from "@/lib/dedupe";
import { ProblemError, toProblemResponse } from "@/lib/errors";
import { assertUuid, readJsonBody } from "@/lib/http";
import { withApiTelemetry } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";
import {
  addAdminMediaAsset,
  deleteAdminMediaAsset,
  updateAdminMediaAsset,
} from "@/modules/portfolio/service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  return withApiTelemetry("POST", "/api/admin/portfolio-items/[id]/media", async () => {
    try {
      const admin = await requireAdmin("content");
      const { id } = await context.params;
      const validId = assertUuid(id, "portfolio item ID");
      const body = await readJsonBody(req);
      const asset = await dedupeRequest(
        `admin-media-add:${validId}:${hashDedupePayload(body)}`,
        () => addAdminMediaAsset(admin, validId, body)
      );
      return NextResponse.json(asset, { status: 201, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  return withApiTelemetry("PATCH", "/api/admin/portfolio-items/[id]/media", async () => {
    try {
      const admin = await requireAdmin("content");
      const { id } = await context.params;
      const validId = assertUuid(id, "portfolio item ID");
      const rawBody = await readJsonBody(req);
      if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
        throw new ProblemError(422, "validation_error", "Invalid request body", "Expected a JSON object.");
      }
      const mediaId = (rawBody as { mediaId?: unknown }).mediaId;
      if (typeof mediaId !== "string" || !mediaId) {
        throw new ProblemError(422, "validation_error", "Missing mediaId", "Specify which media asset to update.");
      }
      const validMediaId = assertUuid(mediaId, "media ID");
      await dedupeRequest(
        `admin-media-patch:${validId}:${validMediaId}:${hashDedupePayload(rawBody)}`,
        () => updateAdminMediaAsset(admin, validId, validMediaId, rawBody)
      );
      return NextResponse.json({ ok: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  return withApiTelemetry("DELETE", "/api/admin/portfolio-items/[id]/media", async () => {
    try {
      const admin = await requireAdmin("content");
      const { id } = await context.params;
      const validId = assertUuid(id, "portfolio item ID");
      const mediaId = req.nextUrl.searchParams.get("mediaId");
      if (!mediaId) {
        throw new ProblemError(422, "validation_error", "Missing mediaId", "Pass ?mediaId=<uuid>.");
      }
      const validMediaId = assertUuid(mediaId, "media ID");
      await dedupeRequest(`admin-media-del:${validId}:${validMediaId}`, () =>
        deleteAdminMediaAsset(admin, validId, validMediaId)
      );
      return NextResponse.json({ ok: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}
