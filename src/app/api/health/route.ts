import { NextRequest, NextResponse } from "next/server";
import { getDbConnectionStatus, withAnonRole } from "@/lib/db";
import { toProblemResponse } from "@/lib/errors";
import { getTelemetryMetrics, recordApiRequest } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";

export async function GET(req: NextRequest) {
  const start = performance.now();
  const requestId = generateRequestId();
  try {
    await withAnonRole(async (tx) => {
      await tx.query("select 1 as ok");
    });

    const metrics = getTelemetryMetrics();
    const dbStatus = getDbConnectionStatus();

    recordApiRequest("GET", "/api/health", performance.now() - start);

    return NextResponse.json(
      {
        ok: true,
        timestamp: new Date().toISOString(),
        uptimeSeconds: metrics.uptimeSeconds,
        currentRpm: metrics.requests.currentRpm,
        database: dbStatus,
        memory: metrics.system.memory,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    recordApiRequest("GET", "/api/health", performance.now() - start);
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
