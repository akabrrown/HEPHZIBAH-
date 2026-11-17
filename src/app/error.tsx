"use client";

import { Button, ButtonLink } from "@/components/ui/button";
import { ShotCaption } from "@/components/ui/viewfinder";

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const refCode = error.digest ?? "HM-ERR-DESK";

  return (
    <div className="min-h-[80vh] bg-[var(--black)] text-[var(--white)] flex items-center justify-center px-4">
      <div className="max-w-lg w-full border border-[var(--hairline)] bg-[var(--ink-2)] p-8 space-y-5">
        <ShotCaption parts={["UNEXPECTED ISSUE", `REF ${refCode}`]} />
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
          Something did not load cleanly.
        </h1>
        <p className="text-sm leading-relaxed text-[var(--grey)]">
          Please try again in a moment. If the issue repeats, share reference{" "}
          <span className="font-mono-meta text-[var(--white)]">{refCode}</span>{" "}
          with our desk on WhatsApp.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="primary" onClick={() => reset()}>
            Try again
          </Button>
          <ButtonLink href="/" variant="secondary">
            Return home
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
