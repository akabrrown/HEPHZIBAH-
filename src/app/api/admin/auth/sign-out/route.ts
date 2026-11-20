import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createSessionCookieOptions,
  getAdminSession,
  revokeSessionJti,
} from "@/lib/auth";

export async function POST() {
  const session = await getAdminSession();
  if (session?.jti) {
    revokeSessionJti(session.jti, session.exp);
  }
  const response = NextResponse.json(
    { ok: true },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
  response.cookies.set(ADMIN_SESSION_COOKIE, "", createSessionCookieOptions(0));
  return response;
}
