import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { PortfolioTile } from "@/components/ui/portfolio-tile";
import { serviceKindValues, type ServiceKind } from "@/modules/catalog/schema";
import { getPublicCatalogue } from "@/modules/catalog/service";
import { getPublicPortfolioList } from "@/modules/portfolio/service";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "Client-consented photography series, films, and graphic design work by Hephzibah Media in Ghana.",
};

function buildFilterHref(kind?: string, occasion?: string): string {
  const params = new URLSearchParams();
  if (kind) params.set("kind", kind);
  if (occasion) params.set("occasion", occasion);
  const qs = params.toString();
  return qs ? `/portfolio?${qs}` : "/portfolio";
}

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; occasion?: string }>;
}) {
  const sp = await searchParams;
  const activeKind = serviceKindValues.includes(sp.kind as ServiceKind)
    ? (sp.kind as ServiceKind)
    : undefined;
  const activeOccasion = sp.occasion?.trim() || undefined;

  const [{ occasions }, items] = await Promise.all([
    getPublicCatalogue(activeKind),
    getPublicPortfolioList({ kind: activeKind, occasionSlug: activeOccasion }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="max-w-3xl mb-8">
        <PageHeading
          title="Portfolio"
          ghostTitle="PORTFOLIO"
          description="Every frame and film here is shown with client permission in its original framing ratio."
        />
      </div>

      {/* URL-backed filter controls */}
      <div className="mt-8 space-y-4 border-y border-[var(--hairline)] py-5">
        <div className="flex flex-wrap items-center gap-2" role="navigation" aria-label="Filter by discipline">
          <span className="mr-2 font-mono-meta text-xs uppercase text-[var(--grey)]">
            Discipline:
          </span>
          <Link
            href={buildFilterHref(undefined, activeOccasion)}
            className={`inline-flex min-h-[44px] items-center rounded-[2px] border px-3.5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] ${
              !activeKind
                ? "border-[var(--cyan)] bg-[var(--cyan)]/15 text-[var(--cyan)] shadow-[0_0_12px_rgba(0,229,255,0.25)] font-bold"
                : "border-[var(--control-border)] text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
            }`}
          >
            All work
          </Link>
          {serviceKindValues.map((k) => (
            <Link
              key={k}
              href={buildFilterHref(k, activeOccasion)}
              className={`inline-flex min-h-[44px] items-center rounded-[2px] border px-3.5 text-sm font-medium capitalize transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] ${
                activeKind === k
                  ? "border-[var(--cyan)] bg-[var(--cyan)]/15 text-[var(--cyan)] shadow-[0_0_12px_rgba(0,229,255,0.25)] font-bold"
                  : "border-[var(--control-border)] text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
              }`}
            >
              {k}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2" role="navigation" aria-label="Filter by occasion">
          <span className="mr-2 font-mono-meta text-xs uppercase text-[var(--grey)]">
            Occasion:
          </span>
          <Link
            href={buildFilterHref(activeKind, undefined)}
            className={`inline-flex min-h-[44px] items-center rounded-[2px] border px-3 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] ${
              !activeOccasion
                ? "border-[var(--cyan)] bg-[var(--cyan)]/15 text-[var(--cyan)] shadow-[0_0_10px_rgba(0,229,255,0.2)] font-bold"
                : "border-[var(--hairline)] text-[var(--grey)] hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
            }`}
          >
            All occasions
          </Link>
          {occasions.map((occ) => (
            <Link
              key={occ.id}
              href={buildFilterHref(activeKind, occ.slug)}
              className={`inline-flex min-h-[44px] items-center rounded-[2px] border px-3 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] ${
                activeOccasion === occ.slug
                  ? "border-[var(--cyan)] bg-[var(--cyan)]/15 text-[var(--cyan)] shadow-[0_0_10px_rgba(0,229,255,0.2)] font-bold"
                  : "border-[var(--hairline)] text-[var(--grey)] hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
              }`}
            >
              {occ.name}
            </Link>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-10 border border-[var(--hairline)] bg-[var(--ink-2)] p-8 text-center">
          <h2 className="font-display text-xl font-bold">Nothing here yet</h2>
          <p className="mt-2 text-sm text-[var(--grey)]">
            No published work matches that filter combination right now.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <ButtonLink href="/portfolio" variant="secondary">
              View all work
            </ButtonLink>
            <ButtonLink href="/book" variant="secondary">
              Request a booking
            </ButtonLink>
          </div>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {items.map((item) => (
            <PortfolioTile key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
