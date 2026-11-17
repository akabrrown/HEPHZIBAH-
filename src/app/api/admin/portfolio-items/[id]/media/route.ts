import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ProblemError, toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
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
  try {
    const admin = await requireAdmin("content");
    const { id } = await context.params;
    const body = await readJsonBody(req);
    const asset = await addAdminMediaAsset(admin, id, body);
    return NextResponse.json(asset, { status: 201, headers: { "Cache-Control": "no-store" } });
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
    const body = (await readJsonBody(req)) as {
      mediaId?: string;
      is_cover?: boolean;
      position?: number;
      alt_text?: string;
      caption?: string | null;
    };
    if (!body.mediaId) {
      throw new ProblemError(422, "validation_error", "Missing mediaId", "Specify which media asset to update.");
    }
    await updateAdminMediaAsset(admin, id, body.mediaId, body);
    return NextResponse.json({ ok: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
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
    const mediaId = req.nextUrl.searchParams.get("mediaId");
    if (!mediaId) {
      throw new ProblemError(422, "validation_error", "Missing mediaId", "Pass ?mediaId=<uuid>.");
    }
    await deleteAdminMediaAsset(admin, id, mediaId);
    return NextResponse.json({ ok: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
