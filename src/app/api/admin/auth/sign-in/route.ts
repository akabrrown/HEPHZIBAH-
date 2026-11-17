import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createSessionCookieOptions,
  signSessionToken,
} from "@/lib/auth";
import { toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { getClientSourceKey } from "@/lib/rate-limit";
import { generateRequestId } from "@/lib/tokens";
import { authenticateAdminPassword } from "@/modules/admin/service";

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  try {
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
}
