import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ProblemError, toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { generateRequestId } from "@/lib/tokens";
import { deleteAdminTestimonial, listAdminContent, upsertAdminTestimonial } from "@/modules/portfolio/service";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const admin = await requireAdmin("content");
    const data = await listAdminContent(admin);
    return NextResponse.json({ testimonials: data.testimonials }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const admin = await requireAdmin("content");
    const body = await readJsonBody(req);
    const saved = await upsertAdminTestimonial(admin, body);
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
      throw new ProblemError(400, "bad_request", "Missing testimonial ID", "Specify an ID parameter to delete.");
    }
    await deleteAdminTestimonial(admin, id);
    return NextResponse.json({ ok: true, id }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
