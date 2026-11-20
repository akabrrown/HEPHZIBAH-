"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminDeskError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl py-12">
      <div className="space-y-4 border border-[var(--red)]/50 bg-[var(--ink-2)] p-6">
        <p className="font-mono-meta text-xs uppercase tracking-[0.2em] text-[var(--red)]">
          Admin desk error
        </p>
        <h1 className="font-display text-2xl font-bold text-[var(--white)]">
          Could not load this admin screen
        </h1>
        <p className="text-sm leading-relaxed text-[var(--grey)]">
          An unexpected database or network error occurred while reading studio records.
        </p>
        {error.digest && (
          <p className="font-mono-meta text-xs text-[var(--grey)]">Digest: {error.digest}</p>
        )}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="button" variant="primary" onClick={reset}>
            Try again
          </Button>
          <Link
            href="/admin"
            className="inline-flex min-h-[48px] items-center rounded-[2px] border border-[var(--control-border)] px-4 py-2 text-sm font-medium text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
