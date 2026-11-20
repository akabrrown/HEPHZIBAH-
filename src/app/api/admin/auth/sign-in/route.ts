import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createSessionCookieOptions,
  signSessionToken,
} from "@/lib/auth";
import { toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { getClientSourceKey, protectEndpoint } from "@/lib/rate-limit";
import { withApiTelemetry } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";
import { authenticateAdminPassword } from "@/modules/admin/service";

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("POST", "/api/admin/auth/sign-in", async () => {
    try {
      protectEndpoint(req, {
        keyPrefix: "admin-signin-ip:15m",
        maxRequests: 15,
        windowMs: 15 * 60_000,
        customMessage: "Too many sign-in attempts from this network. Wait 15 minutes before trying again.",
      });

      const body = await readJsonBody(req);
      const source = getClientSourceKey(req.headers);
      const sessionPayload = await authenticateAdminPassword(body, source);
      const token = signSessionToken(sessionPayload);

      const response = NextResponse.json(
        {
          nextStep: "verify_totp",
          displayName: sessionPayload.displayName,
          email: sessionPayload.email,
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
      response.cookies.set(ADMIN_SESSION_COOKIE, token, createSessionCookieOptions());
      return response;
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}
