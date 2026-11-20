"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/use-online-status";

export function OfflineBanner({ className = "" }: { className?: string }) {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start gap-2.5 rounded-[2px] border border-[var(--amber)]/50 bg-[var(--ink-2)] p-3 text-sm text-[var(--white)] ${className}`}
    >
      <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-[var(--amber)]" aria-hidden="true" />
      <p>
        You appear to be offline. Reconnect to the internet before sending changes or refreshing data.
      </p>
    </div>
  );
}
