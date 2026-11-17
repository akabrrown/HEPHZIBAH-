import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createSessionCookieOptions,
  getAdminSession,
  signSessionToken,
} from "@/lib/auth";
import { ProblemError, toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { generateRequestId } from "@/lib/tokens";
import { verifyAdminTotpAndUpgradeSession } from "@/modules/admin/service";

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const current = await getAdminSession();
    if (!current) {
      throw new ProblemError(401, "unauthorized", "Sign in first", "Enter your email and password before entering your authenticator code.");
    }
    const body = await readJsonBody(req);
    const upgraded = await verifyAdminTotpAndUpgradeSession(current, body);
    const token = signSessionToken(upgraded);

    const response = NextResponse.json(
      {
        ok: true,
        displayName: upgraded.displayName,
        scopes: upgraded.scopes,
        aal: upgraded.aal,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
    response.cookies.set(ADMIN_SESSION_COOKIE, token, createSessionCookieOptions());
    return response;
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
