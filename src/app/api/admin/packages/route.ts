import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ProblemError, toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { generateRequestId } from "@/lib/tokens";
import { deleteAdminPackage, listAdminServicesAndPackages, upsertAdminPackage } from "@/modules/catalog/service";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const admin = await requireAdmin("content");
    const data = await listAdminServicesAndPackages(admin);
    return NextResponse.json({ packages: data.packages }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const admin = await requireAdmin("content");
    const body = await readJsonBody(req);
    const saved = await upsertAdminPackage(admin, body);
    return NextResponse.json(saved, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}

export async function DELETE(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const admin = await requireAdmin("content");
    const id =
      req.nextUrl.searchParams.get("id") ||
      ((await readJsonBody(req).catch(() => ({}))) as { id?: string }).id;
    if (!id) {
      throw new ProblemError(400, "bad_request", "Missing package ID", "Specify an ID parameter to delete.");
    }
    await deleteAdminPackage(admin, id);
    return NextResponse.json({ ok: true, id }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
