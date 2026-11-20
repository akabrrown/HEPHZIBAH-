import type { Metadata } from "next";
import { Suspense } from "react";
import { PortfolioFilterClient } from "@/components/portfolio/portfolio-filter-client";
import { PageHeading } from "@/components/ui/page-heading";
import { getPublicCatalogue } from "@/modules/catalog/service";
import { getPublicPortfolioList } from "@/modules/portfolio/service";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "Client-consented photography series, films, and graphic design work by Hephzibah Media in Ghana.",
};

export default async function PortfolioPage() {
  const [{ occasions }, items] = await Promise.all([
    getPublicCatalogue(),
    getPublicPortfolioList(),
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

      <Suspense
        fallback={
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading portfolio">
            <div className="h-72 rounded-[2px] border border-[var(--hairline)] bg-[var(--ink-2)]" />
            <div className="h-72 rounded-[2px] border border-[var(--hairline)] bg-[var(--ink-2)]" />
            <div className="h-72 rounded-[2px] border border-[var(--hairline)] bg-[var(--ink-2)]" />
          </div>
        }
      >
        <PortfolioFilterClient items={items} occasions={occasions} />
      </Suspense>
    </div>
  );
}
