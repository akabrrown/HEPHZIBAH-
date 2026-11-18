import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ProblemError, toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { generateRequestId } from "@/lib/tokens";
import { deleteAdminFaq, listAdminContent, upsertAdminFaq } from "@/modules/portfolio/service";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const admin = await requireAdmin("content");
    const data = await listAdminContent(admin);
    return NextResponse.json({ faqs: data.faqs }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const admin = await requireAdmin("content");
    const body = await readJsonBody(req);
    const saved = await upsertAdminFaq(admin, body);
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
      throw new ProblemError(400, "bad_request", "Missing FAQ ID", "Specify an ID parameter to delete.");
    }
    await deleteAdminFaq(admin, id);
    return NextResponse.json({ ok: true, id }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
