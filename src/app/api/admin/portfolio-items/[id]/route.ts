import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dedupeRequest, hashDedupePayload } from "@/lib/dedupe";
import { ProblemError, toProblemResponse } from "@/lib/errors";
import { assertUuid, readJsonBody } from "@/lib/http";
import { withApiTelemetry } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";
import { getAdminPortfolioDetail, upsertAdminPortfolioItem, deleteAdminPortfolioItem } from "@/modules/portfolio/service";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  return withApiTelemetry("GET", "/api/admin/portfolio-items/[id]", async () => {
    try {
      const admin = await requireAdmin("content");
      const { id } = await context.params;
      const validId = assertUuid(id, "portfolio item ID");
      const item = await getAdminPortfolioDetail(admin, validId);
      return NextResponse.json(item, { status: 200, headers: { "Cache-Control": "no-store" } });
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
  return withApiTelemetry("PATCH", "/api/admin/portfolio-items/[id]", async () => {
    try {
      const admin = await requireAdmin("content");
      const { id } = await context.params;
      const validId = assertUuid(id, "portfolio item ID");
      const rawBody = await readJsonBody(req);
      if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
        throw new ProblemError(422, "validation_error", "Invalid request body", "Expected a JSON object.");
      }
      const payload = { ...(rawBody as Record<string, unknown>), id: validId };
      const updated = await dedupeRequest(
        `admin-portfolio:${validId}:${hashDedupePayload(payload)}`,
        () => upsertAdminPortfolioItem(admin, payload)
      );
      return NextResponse.json(updated, { status: 200, headers: { "Cache-Control": "no-store" } });
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
  return withApiTelemetry("DELETE", "/api/admin/portfolio-items/[id]", async () => {
    try {
      const admin = await requireAdmin("content");
      const { id } = await context.params;
      const validId = assertUuid(id, "portfolio item ID");
      await dedupeRequest(`admin-portfolio-del:${validId}`, () =>
        deleteAdminPortfolioItem(admin, validId)
      );
      return NextResponse.json({ ok: true, id: validId }, { status: 200, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}
