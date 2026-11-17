import Link from "next/link";
import { ShotCaption } from "@/components/ui/viewfinder";

export function ScopeDenied({ requiredScope }: { requiredScope: string }) {
  return (
    <div className="border-2 border-[var(--red)] bg-[var(--ink-2)] p-8 max-w-xl space-y-4">
      <ShotCaption parts={["ACCESS DENIED", `SCOPE REQUIRED: ${requiredScope.toUpperCase()}`]} />
      <h1 className="font-display text-2xl font-extrabold">Permission denied</h1>
      <p className="text-sm text-[var(--grey)]">
        Your admin account does not hold the <span className="font-mono-meta text-[var(--white)]">{requiredScope}</span> scope. Ask a team owner if you need access.
      </p>
      <Link href="/admin" className="inline-block text-sm text-[var(--cyan)] underline underline-offset-4">
        Return to dashboard
      </Link>
    </div>
  );
}
