"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RetryOutboxButton({ outboxId }: { outboxId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  async function handleRetry() {
    setStatus("sending");
    setErrorDetail(null);
    try {
      const res = await fetch("/api/admin/outbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outboxId }),
      });
      const body = (await res.json().catch(() => null)) as { detail?: string } | null;
      if (!res.ok) {
        setStatus("error");
        setErrorDetail(body?.detail ?? "Retry failed.");
        return;
      }
      setStatus("done");
      router.refresh();
    } catch {
      setStatus("error");
      setErrorDetail("Network error retrying delivery.");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="secondary"
        onClick={handleRetry}
        disabled={status === "sending" || status === "done"}
        className="min-h-[44px] px-3 py-1.5 text-xs"
      >
        {status === "sending"
          ? "Sending..."
          : status === "done"
            ? "Sent"
            : status === "error"
              ? "Retry again"
              : "Resend"}
      </Button>
      {errorDetail && (
        <span role="alert" className="text-xs text-[var(--red)]">
          {errorDetail}
        </span>
      )}
    </div>
  );
}
