"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PortfolioTile } from "@/components/ui/portfolio-tile";
import { serviceKindValues, type Occasion, type ServiceKind } from "@/modules/catalog/schema";
import type { PortfolioItem } from "@/modules/portfolio/schema";

export function PortfolioFilterClient({
  items,
  occasions,
}: {
  items: PortfolioItem[];
  occasions: Occasion[];
}) {
  const router = useRouter();
  const pathname = usePathname() || "/portfolio";
  const searchParams = useSearchParams();

  const rawKind = searchParams.get("kind");
  const activeKind = serviceKindValues.includes(rawKind as ServiceKind)
    ? (rawKind as ServiceKind)
    : undefined;
  const activeOccasion = searchParams.get("occasion")?.trim() || undefined;

  const filteredOccasions = useMemo(() => {
    if (!activeKind) return occasions;
    return occasions.filter((occ) => occ.applies_to.includes(activeKind));
  }, [occasions, activeKind]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeKind && item.kind !== activeKind) return false;
      if (activeOccasion && item.occasion_slug !== activeOccasion) return false;
      return true;
    });
  }, [items, activeKind, activeOccasion]);

  function updateFilter(kind?: string, occasion?: string) {
    const params = new URLSearchParams();
    if (kind) params.set("kind", kind);
    if (occasion) params.set("occasion", occasion);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <>
      <div className="mt-8 space-y-4 border-y border-[var(--hairline)] py-5">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by discipline">
          <span className="mr-2 font-mono-meta text-xs uppercase text-[var(--grey)]">
            Discipline:
          </span>
          <button
            type="button"
            aria-pressed={!activeKind}
            onClick={() => updateFilter(undefined, activeOccasion)}
            className={`inline-flex min-h-[44px] items-center rounded-[2px] border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] cursor-pointer ${
              !activeKind
                ? "border-[var(--cyan)] bg-[var(--cyan)]/15 text-[var(--cyan)] font-bold"
                : "border-[var(--control-border)] text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
            }`}
          >
            All work
          </button>
          {serviceKindValues.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={activeKind === k}
              onClick={() => updateFilter(k, activeOccasion)}
              className={`inline-flex min-h-[44px] items-center rounded-[2px] border px-3.5 text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] cursor-pointer ${
                activeKind === k
                  ? "border-[var(--cyan)] bg-[var(--cyan)]/15 text-[var(--cyan)] font-bold"
                  : "border-[var(--control-border)] text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by occasion">
          <span className="mr-2 font-mono-meta text-xs uppercase text-[var(--grey)]">
            Occasion:
          </span>
          <button
            type="button"
            aria-pressed={!activeOccasion}
            onClick={() => updateFilter(activeKind, undefined)}
            className={`inline-flex min-h-[44px] items-center rounded-[2px] border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] cursor-pointer ${
              !activeOccasion
                ? "border-[var(--cyan)] bg-[var(--cyan)]/15 text-[var(--cyan)] font-bold"
                : "border-[var(--hairline)] text-[var(--grey)] hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
            }`}
          >
            All occasions
          </button>
          {filteredOccasions.map((occ) => (
            <button
              key={occ.id}
              type="button"
              aria-pressed={activeOccasion === occ.slug}
              onClick={() => updateFilter(activeKind, occ.slug)}
              className={`inline-flex min-h-[44px] items-center rounded-[2px] border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] cursor-pointer ${
                activeOccasion === occ.slug
                  ? "border-[var(--cyan)] bg-[var(--cyan)]/15 text-[var(--cyan)] font-bold"
                  : "border-[var(--hairline)] text-[var(--grey)] hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
              }`}
            >
              {occ.name}
            </button>
          ))}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="mt-12 border border-[var(--hairline)] bg-[var(--ink-2)] p-10 text-center">
          <p className="font-display text-xl font-bold text-[var(--white)]">
            No portfolio entries match this filter yet
          </p>
          <p className="mt-2 text-sm text-[var(--grey)]">
            Not every client chooses public display. Clear your filter or ask our desk for private samples matching your occasion.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button type="button" variant="secondary" onClick={() => updateFilter()}>
              Clear filters
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <PortfolioTile key={item.id} item={item} />
          ))}
        </div>
      )}
    </>
  );
}
