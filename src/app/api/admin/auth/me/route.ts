import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { toProblemResponse } from "@/lib/errors";
import { withApiTelemetry } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("GET", "/api/admin/auth/me", async () => {
    try {
      const admin = await requireAdmin();
      return NextResponse.json(
        {
          adminId: admin.adminId,
          email: admin.email,
          displayName: admin.displayName,
          scopes: admin.scopes,
          aal: admin.aal,
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}
