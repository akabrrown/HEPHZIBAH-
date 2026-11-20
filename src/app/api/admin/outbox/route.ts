import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { dedupeRequest } from "@/lib/dedupe";
import { ProblemError, toProblemResponse } from "@/lib/errors";
import { assertUuid, readJsonBody } from "@/lib/http";
import { withApiTelemetry } from "@/lib/telemetry";
import { generateRequestId } from "@/lib/tokens";
import { listOutboxForAdmin, retryOutboxMessage } from "@/modules/notify/service";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("GET", "/api/admin/outbox", async () => {
    try {
      await requireAdmin("bookings");
      const rows = await listOutboxForAdmin();
      return NextResponse.json({ items: rows }, { status: 200, headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  return withApiTelemetry("POST", "/api/admin/outbox", async () => {
    try {
      await requireAdmin("bookings");
      const rawBody = await readJsonBody(req);
      if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
        throw new ProblemError(422, "validation_error", "Invalid request body", "Provide an outboxId.");
      }
      const rawId = (rawBody as { outboxId?: unknown }).outboxId;
      if (typeof rawId !== "string" || !rawId) {
        throw new ProblemError(422, "validation_error", "Missing outboxId", "Provide an outbox message ID to retry.");
      }
      const outboxId = assertUuid(rawId, "outbox ID");
      const outcome = await dedupeRequest(`admin-outbox-retry:${outboxId}`, () =>
        retryOutboxMessage(outboxId)
      );
      if (outcome.status === "failed" || outcome.status === "dead") {
        throw new ProblemError(
          502,
          "email_delivery_failed",
          "Email retry failed",
          outcome.lastError ?? "Email provider rejected the delivery attempt."
        );
      }
      return NextResponse.json(
        { ok: true, status: outcome.status },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    } catch (err) {
      return toProblemResponse(err, req.nextUrl.pathname, requestId);
    }
  });
}
