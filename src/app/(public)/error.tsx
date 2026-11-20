"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <div className="space-y-5 border border-[var(--hairline)] bg-[var(--ink-2)] p-8">
        <p className="font-mono-meta text-xs uppercase tracking-[0.2em] text-[var(--red)]">
          Temporarily unavailable
        </p>
        <h1 className="font-display text-2xl font-bold text-[var(--white)] sm:text-3xl">
          We could not load this page right now.
        </h1>
        <p className="text-sm leading-relaxed text-[var(--grey)]">
          A temporary connection issue interrupted loading. Please try again in a moment or return to the homepage.
        </p>
        {error.digest && (
          <p className="font-mono-meta text-xs text-[var(--grey)]">
            Reference code: {error.digest}
          </p>
        )}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="button" variant="primary" onClick={reset}>
            Try again
          </Button>
          <Link
            href="/"
            className="inline-flex min-h-[48px] items-center rounded-[2px] border border-[var(--control-border)] px-5 py-2.5 text-sm font-medium text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)]"
          >
            Back to home
          </Link>
        </div>
      </div>
    </section>
  );
}
