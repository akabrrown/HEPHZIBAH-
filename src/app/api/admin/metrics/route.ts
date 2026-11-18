import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getDbConnectionStatus } from "@/lib/db";
import { getDedupeStats } from "@/lib/dedupe";
import { getServerEnv } from "@/lib/env";
import { ProblemError, toProblemResponse } from "@/lib/errors";
import { getTelemetryMetrics } from "@/lib/telemetry";
import { generateRequestId, safeCompare } from "@/lib/tokens";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    // Authorized via admin session OR Bearer CRON_SECRET token
    const admin = await getAdminSession();
    let isAuthorized = Boolean(admin);

    if (!isAuthorized) {
      const authHeader = req.headers.get("authorization") ?? "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
      const env = getServerEnv();
      if (env.CRON_SECRET && safeCompare(token, env.CRON_SECRET)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      throw new ProblemError(
        401,
        "unauthorized",
        "Unauthorized",
        "Sign in as admin or supply valid monitoring credentials to view telemetry metrics."
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
}
