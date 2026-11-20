import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { toProblemResponse } from "@/lib/errors";
import { withApiTelemetry } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";
import { getAdminDashboardSummary } from "@/modules/admin/service";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("GET", "/api/admin/dashboard", async () => {
    try {
      const admin = await requireAdmin();
      const summary = await getAdminDashboardSummary(admin);
      return NextResponse.json(summary, { status: 200, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}
