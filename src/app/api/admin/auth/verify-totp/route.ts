import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createSessionCookieOptions,
  getAdminSession,
  signSessionToken,
} from "@/lib/auth";
import { ProblemError, toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { protectEndpoint } from "@/lib/rate-limit";
import { recordApiRequest } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";
import { verifyAdminTotpAndUpgradeSession } from "@/modules/admin/service";

export async function POST(req: NextRequest) {
  const start = performance.now();
  const requestId = generateRequestId();
  try {
    protectEndpoint(req, {
      keyPrefix: "admin-totp:15m",
      maxRequests: 10,
      windowMs: 15 * 60_000,
      customMessage: "Too many TOTP attempts. Please wait 15 minutes before trying again.",
    });

    const current = await getAdminSession();
    if (!current) {
      throw new ProblemError(401, "unauthorized", "Sign in first", "Enter your email and password before entering your authenticator code.");
    }
    const body = await readJsonBody(req);
    const upgraded = await verifyAdminTotpAndUpgradeSession(current, body);
    const token = signSessionToken(upgraded);

    recordApiRequest("POST", "/api/admin/auth/verify-totp", performance.now() - start);

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
    recordApiRequest("POST", "/api/admin/auth/verify-totp", performance.now() - start);
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
