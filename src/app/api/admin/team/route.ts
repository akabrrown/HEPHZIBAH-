import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { generateRequestId } from "@/lib/tokens";
import { createTeamAdmin, listTeamAdmins, updateTeamAdmin } from "@/modules/admin/service";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const admin = await requireAdmin("team");
    const members = await listTeamAdmins(admin);
    return NextResponse.json({ members }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const admin = await requireAdmin("team");
    const body = await readJsonBody(req);
    const created = await createTeamAdmin(admin, body);
    return NextResponse.json(created, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}

export async function PATCH(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const admin = await requireAdmin("team");
    const body = await readJsonBody(req);
    const updated = await updateTeamAdmin(admin, body);
    return NextResponse.json(updated, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
