import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dedupeRequest, hashDedupePayload } from "@/lib/dedupe";
import { toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { withApiTelemetry } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";
import { listAdminPortfolio, upsertAdminPortfolioItem } from "@/modules/portfolio/service";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("GET", "/api/admin/portfolio-items", async () => {
    try {
      const admin = await requireAdmin("content");
      const items = await listAdminPortfolio(admin);
      return NextResponse.json({ items }, { status: 200, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("POST", "/api/admin/portfolio-items", async () => {
    try {
      const admin = await requireAdmin("content");
      const body = await readJsonBody(req);
      const item = await dedupeRequest(
        `admin-portfolio:${admin.adminId}:${hashDedupePayload(body)}`,
        () => upsertAdminPortfolioItem(admin, body)
      );
      return NextResponse.json(item, { status: 201, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}
