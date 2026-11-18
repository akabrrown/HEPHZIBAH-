import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { ProblemError, toProblemResponse } from "@/lib/errors";
import { checkSlidingWindowLimit } from "@/lib/rate-limit";
import { recordApiRequest } from "@/lib/telemetry";
import { generateRequestId, safeCompare } from "@/lib/tokens";
import {
  processEmailOutbox,
  queueShootReminders,
  runRetentionCleanup,
} from "@/modules/notify/service";
import { expireDueQuotes } from "@/modules/quoting/service";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ job: string }> }
) {
  const start = performance.now();
  const requestId = generateRequestId();
  try {
    const env = getServerEnv();
    const authHeader = req.headers.get("authorization") ?? "";
    const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!env.CRON_SECRET || !safeCompare(provided, env.CRON_SECRET)) {
      throw new ProblemError(401, "unauthorized", "Cron unauthorized", "Invalid CRON_SECRET.");
    }

    const { job } = await context.params;

    // Throttle cron invocations to prevent excessive CPU or email billing loops
    const cronLimit = checkSlidingWindowLimit(`cron:${job}`, 2, 10_000);
    if (!cronLimit.allowed) {
      throw new ProblemError(429, "rate_limited", "Cron throttled", "Wait before re-triggering this job.");
    }

    let responseData: Record<string, unknown>;
    switch (job) {
      case "expire-quotes": {
        const expired = await expireDueQuotes();
        responseData = { ok: true, job, expired };
        break;
      }
      case "send-email": {
        const result = await processEmailOutbox();
        responseData = { ok: true, job, ...result };
        break;
      }
      case "reminders": {
        const queued = await queueShootReminders();
        const delivered = queued > 0 ? await processEmailOutbox() : { sent: 0, failed: 0 };
        responseData = { ok: true, job, queued, ...delivered };
        break;
      }
      case "retention": {
        const cleaned = await runRetentionCleanup();
        responseData = { ok: true, job, ...cleaned };
        break;
      }
      default:
        throw new ProblemError(404, "not_found", "Unknown cron job", `Unsupported job: ${job}`);
    }

    recordApiRequest("GET", `/api/cron/${job}`, performance.now() - start);
    return NextResponse.json(responseData);
  } catch (err) {
    recordApiRequest("GET", "/api/cron", performance.now() - start);
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
