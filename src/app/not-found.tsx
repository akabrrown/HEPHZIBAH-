import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { ShotCaption } from "@/components/ui/viewfinder";

export default function NotFoundPage() {
  return (
    <div className="min-h-[80vh] bg-[var(--black)] text-[var(--white)] flex items-center justify-center px-4">
      <div className="max-w-xl w-full border border-[var(--hairline)] bg-[var(--ink-2)] p-8 space-y-6">
        <ShotCaption parts={["ERROR 404", "FRAME NOT FOUND"]} />
        <h1 className="font-display text-3xl font-extrabold">
          That page could not be found.
        </h1>
        <p className="text-sm leading-relaxed text-[var(--grey)]">
          The link may be outdated or the address may have a typo. Choose one of the studio pages below to continue.
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/" variant="primary">
            Go to home
          </ButtonLink>
          <ButtonLink href="/portfolio" variant="secondary">
            Explore portfolio
          </ButtonLink>
          <ButtonLink href="/book" variant="secondary">
            Request a booking
          </ButtonLink>
        </div>
        <div className="border-t border-[var(--hairline)] pt-4 text-xs text-[var(--grey)] flex flex-wrap gap-4">
          <Link href="/portfolio?occasion=wedding" className="hover:text-[var(--cyan)]">
            Weddings
          </Link>
          <Link href="/portfolio?occasion=traditional-marriage" className="hover:text-[var(--cyan)]">
            Traditional marriage
          </Link>
          <Link href="/portfolio?occasion=corporate-event" className="hover:text-[var(--cyan)]">
            Corporate events
          </Link>
          <Link href="/services/design" className="hover:text-[var(--cyan)]">
            Graphic design
          </Link>
        </div>
      </div>
    </div>
  );
}
