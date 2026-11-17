import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { ProblemError, toProblemResponse } from "@/lib/errors";
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
  const requestId = generateRequestId();
  try {
    const env = getServerEnv();
    const authHeader = req.headers.get("authorization") ?? "";
    const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    if (!env.CRON_SECRET || !safeCompare(provided, env.CRON_SECRET)) {
      throw new ProblemError(401, "unauthorized", "Cron unauthorized", "Invalid CRON_SECRET.");
    }

    const { job } = await context.params;
    switch (job) {
      case "expire-quotes": {
        const expired = await expireDueQuotes();
        return NextResponse.json({ ok: true, job, expired });
      }
      case "send-email": {
        const result = await processEmailOutbox();
        return NextResponse.json({ ok: true, job, ...result });
      }
      case "reminders": {
        const queued = await queueShootReminders();
        const delivered = queued > 0 ? await processEmailOutbox() : { sent: 0, failed: 0 };
        return NextResponse.json({ ok: true, job, queued, ...delivered });
      }
      case "retention": {
        const cleaned = await runRetentionCleanup();
        return NextResponse.json({ ok: true, job, ...cleaned });
      }
      default:
        throw new ProblemError(404, "not_found", "Unknown cron job", `Unsupported job: ${job}`);
    }
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
