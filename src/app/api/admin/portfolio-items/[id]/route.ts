import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { generateRequestId } from "@/lib/tokens";
import { getAdminPortfolioDetail, upsertAdminPortfolioItem, deleteAdminPortfolioItem } from "@/modules/portfolio/service";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const admin = await requireAdmin("content");
    const { id } = await context.params;
    const item = await getAdminPortfolioDetail(admin, id);
    return NextResponse.json(item, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const admin = await requireAdmin("content");
    const { id } = await context.params;
    const body = (await readJsonBody(req)) as Record<string, unknown>;
    const updated = await upsertAdminPortfolioItem(admin, { ...body, id });
    return NextResponse.json(updated, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const admin = await requireAdmin("content");
    const { id } = await context.params;
    await deleteAdminPortfolioItem(admin, id);
    return NextResponse.json({ ok: true, id }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
