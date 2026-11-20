import { NextRequest, NextResponse } from "next/server";
import { withAnonRole } from "@/lib/db";
import { toProblemResponse } from "@/lib/errors";
import { protectEndpoint } from "@/lib/rate-limit";
import { withApiTelemetry } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("GET", "/api/health", async () => {
    try {
      protectEndpoint(req, {
        keyPrefix: "health:1m",
        maxRequests: 30,
        windowMs: 60_000,
        blockBots: false,
        customMessage: "Health check rate limit reached.",
      });

      await withAnonRole(async (tx) => {
        await tx.query("select 1 as ok");
      });

      return NextResponse.json(
        {
          ok: true,
          timestamp: new Date().toISOString(),
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
          },
        }
      );
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}
