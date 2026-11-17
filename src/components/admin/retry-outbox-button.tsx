"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RetryOutboxButton({ outboxId }: { outboxId: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function handleRetry() {
    setStatus("sending");
    try {
      const res = await fetch("/api/admin/outbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outboxId }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={handleRetry}
      disabled={status === "sending" || status === "done"}
      className="min-h-[38px] px-3 py-1.5 text-xs"
    >
      {status === "sending"
        ? "Sending..."
        : status === "done"
          ? "Queued"
          : status === "error"
            ? "Retry failed"
            : "Resend"}
    </Button>
  );
}
