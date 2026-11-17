import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { PortfolioGalleryClient } from "@/components/ui/lightbox";
import { PortfolioTile } from "@/components/ui/portfolio-tile";
import { RecDot } from "@/components/ui/viewfinder";
import { getPublicPortfolioDetail, getPublicPortfolioList } from "@/modules/portfolio/service";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublicPortfolioDetail(slug);
  if (!item) return { title: "Portfolio item not found" };
  return {
    title: item.title,
    description: item.summary ?? `${item.title} — ${item.kind} commission by Hephzibah Media.`,
  };
}

export default async function PortfolioItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getPublicPortfolioDetail(slug);
  if (!item) {
    notFound();
  }

  const related = (await getPublicPortfolioList({ kind: item.kind }))
    .filter((other) => other.id !== item.id)
    .slice(0, 2);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-6">
        <Link
          href="/portfolio"
          className="inline-flex min-h-[44px] items-center text-sm text-[var(--cyan)] underline underline-offset-4"
        >
          Back to portfolio
        </Link>
      </div>

      <header className="space-y-4 border-b border-[var(--hairline)] pb-6">
        <PageHeading
          title={item.title}
          ghostTitle={item.kind}
          description={item.summary}
        />
        {item.kind === "videography" && (
          <div className="pt-1">
            <RecDot label="VIDEO" />
          </div>
        )}
      </header>

      <div className="mt-8">
        {item.media_assets && item.media_assets.length > 0 ? (
          <PortfolioGalleryClient assets={item.media_assets} title={item.title} />
        ) : (
          <p className="text-sm text-[var(--grey)]">No media frames attached yet.</p>
        )}
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border border-[var(--hairline)] bg-[var(--ink-2)] p-6">
        <div>
          <h2 className="font-display text-xl font-bold">Planning something similar?</h2>
          <p className="mt-1 text-sm text-[var(--grey)]">
            Send a request with your date or deadline and we will quote within one working day.
          </p>
        </div>
        <ButtonLink
          href={`/book?kind=${item.kind}${item.occasion_id ? `&occasion=${item.occasion_id}` : ""}`}
          variant="secondary"
        >
          Request a similar booking
        </ButtonLink>
      </div>

      {related.length > 0 && (
        <section className="mt-14 border-t border-[var(--hairline)] pt-10">
          <h2 className="mb-6 font-display text-2xl font-bold">More {item.kind} work</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {related.map((other) => (
              <PortfolioTile key={other.id} item={other} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
