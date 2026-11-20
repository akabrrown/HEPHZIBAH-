import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDbConnectionStatus } from "@/lib/db";
import { getDedupeStats } from "@/lib/dedupe";
import { getServerEnv } from "@/lib/env";
import { ProblemError, toProblemResponse } from "@/lib/errors";
import { getTelemetryMetrics, withApiTelemetry } from "@/lib/telemetry";
import { generateRequestId, safeCompare } from "@/lib/tokens";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("GET", "/api/admin/metrics", async () => {
    try {
      // Authorized via active MFA-verified settings admin OR Bearer CRON_SECRET token
      let isAuthorized = false;
      try {
        await requireAdmin("settings");
        isAuthorized = true;
      } catch {
        const authHeader = req.headers.get("authorization") ?? "";
        const token = authHeader.toLowerCase().startsWith("bearer ")
          ? authHeader.slice(7).trim()
          : "";
        const env = getServerEnv();
        if (env.CRON_SECRET && token && safeCompare(token, env.CRON_SECRET)) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        throw new ProblemError(
          401,
          "unauthorized",
          "Unauthorized",
          "Sign in with settings permissions or supply valid monitoring credentials to view telemetry metrics."
        );
      }

      const telemetry = getTelemetryMetrics();
      const dedupeStats = getDedupeStats();
      const dbStatus = getDbConnectionStatus();

      return NextResponse.json(
        {
          telemetry,
          deduplication: dedupeStats,
          databaseStatus: dbStatus,
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}
