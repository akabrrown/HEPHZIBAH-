import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ProblemError, toProblemResponse } from "@/lib/errors";
import { readJsonBody } from "@/lib/http";
import { generateRequestId } from "@/lib/tokens";
import { listOutboxForAdmin, retryOutboxMessage } from "@/modules/notify/service";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    await requireAdmin("bookings");
    const rows = await listOutboxForAdmin();
    return NextResponse.json({ items: rows }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    await requireAdmin("bookings");
    const body = (await readJsonBody(req)) as { outboxId?: string };
    if (!body.outboxId) {
      throw new ProblemError(422, "validation_error", "Missing outboxId", "Provide an outbox message ID to retry.");
    }
    await retryOutboxMessage(body.outboxId);
    return NextResponse.json({ ok: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toProblemResponse(err, req.nextUrl.pathname, requestId);
  }
}
