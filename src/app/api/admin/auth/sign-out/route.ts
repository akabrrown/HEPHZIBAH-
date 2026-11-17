import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, createSessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", createSessionCookieOptions(0));
  return response;
}
