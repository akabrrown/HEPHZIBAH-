import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera, Film, Layers } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { PortfolioTile } from "@/components/ui/portfolio-tile";
import { formatGhsFromMinor } from "@/lib/money";
import { serviceKindValues, type ServiceKind } from "@/modules/catalog/schema";
import { getPublicCatalogue } from "@/modules/catalog/service";
import { getPublicPortfolioList } from "@/modules/portfolio/service";

export const revalidate = 300;

export function generateStaticParams() {
  return serviceKindValues.map((kind) => ({ kind }));
}

const KIND_COPY: Record<
  ServiceKind,
  { title: string; intro: string; whatYouGet: string[] }
> = {
  photography: {
    title: "Photography",
    intro:
      "Quiet, observant event and commercial photography. From traditional marriages and church weddings to respectful funeral documentation and studio portraits.",
    whatYouGet: [
      "Colour-calibrated digital gallery with high-resolution downloads",
      "Consistent exposure and natural skin tones across mixed venue lighting",
      "Client privacy respected: nothing published publicly without written consent",
    ],
  },
  videography: {
    title: "Videography",
    intro:
      "Multi-camera event coverage, music videos, and founder documentaries recorded with dedicated audio capture so vows, speeches, and performances sound clean.",
    whatYouGet: [
      "Discrete lapel and ambient audio recording alongside 4K video capture",
      "Graded highlight cut plus full ceremony documentation where requested",
      "Digital master delivery formatted for archive and social sharing",
    ],
  },
  design: {
    title: "Graphic Design",
    intro:
      "Logo systems, event invitations and memorial programmes, campaign flyers, and social asset suites built accurately for both Accra press houses and mobile screens.",
    whatYouGet: [
      "Print-ready CMYK PDFs with clean bleed and typography hierarchy",
      "RGB exports pre-sized for WhatsApp Status, Instagram, and web headers",
      "Vector source files for identity projects once approved",
    ],
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ kind: string }>;
}): Promise<Metadata> {
  const { kind } = await params;
  if (!serviceKindValues.includes(kind as ServiceKind)) {
    return { title: "Service not found" };
  }
  const copy = KIND_COPY[kind as ServiceKind];
  return {
    title: `${copy.title} Services`,
    description: copy.intro,
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind: rawKind } = await params;
  if (!serviceKindValues.includes(rawKind as ServiceKind)) {
    notFound();
  }
  const kind = rawKind as ServiceKind;
  const copy = KIND_COPY[kind];

  const [{ occasions, services, packages }, relatedWork] = await Promise.all([
    getPublicCatalogue(kind),
    getPublicPortfolioList({ kind }),
  ]);

  return (
    <div>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <PageHeading
          title={copy.title}
          ghostTitle={kind}
          description={copy.intro}
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <h2 className="font-display text-xl font-bold">Sub-services</h2>
            <div className="space-y-3">
              {services.map((svc) => (
                <div
                  key={svc.id}
                  className="flex flex-wrap items-center justify-between gap-4 border border-[var(--hairline)] bg-[var(--ink-2)] p-4"
                >
                  <div className="max-w-lg">
                    <h3 className="font-display text-lg font-bold text-[var(--white)]">
                      {svc.name}
                    </h3>
                    <p className="mt-1 text-sm text-[var(--grey)]">{svc.summary}</p>
                    {svc.starting_price_minor !== null && (
                      <p className="mt-2 font-mono-meta text-xs text-[var(--cyan)]">
                        Starting from {formatGhsFromMinor(svc.starting_price_minor)}
                      </p>
                    )}
                  </div>
                  <ButtonLink
                    href={`/book?kind=${kind}&service=${svc.id}`}
                    variant="secondary"
                  >
                    Request this
                  </ButtonLink>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6 lg:col-span-5">
            <div className="overflow-hidden rounded-[2px] border border-[var(--hairline)] bg-[var(--ink-2)] p-6">
              <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[2px] border border-[var(--hairline)] bg-[var(--black)] text-[var(--cyan)]">
                    {kind === "photography" ? (
                      <Camera className="h-5 w-5" />
                    ) : kind === "videography" ? (
                      <Film className="h-5 w-5" />
                    ) : (
                      <Layers className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <span className="block font-mono-meta text-[10px] uppercase tracking-wider text-[var(--grey)]">
                      STUDIO DISCIPLINE
                    </span>
                    <span className="block font-mono-meta text-xs font-bold text-[var(--white)] uppercase">
                      HEPHZIBAH {kind}
                    </span>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-[2px] border border-[var(--hairline)] bg-[var(--black)] px-2.5 py-1 font-mono-meta text-[10px] font-bold text-[var(--cyan)]">
                  ACCRA DESK
                </span>
              </div>
              <p className="text-xs leading-relaxed text-[var(--grey)] font-mono-meta">
                {kind === "photography"
                  ? "Dual-card mirrorless bodies, prime focal lengths (24mm, 35mm, 50mm, 85mm), calibrated on-location flash units, and multi-redundant NVMe storage."
                  : kind === "videography"
                  ? "4K 10-bit log multi-camera setups, wireless 32-bit float lavalier microphones, gimbal stabilization, and color-graded cinematic mastering."
                  : "Vector typography standards, CMYK print preparation, digital social suites, high-resolution master asset delivery with full commercial rights."}
              </p>
            </div>

            <div className="border border-[var(--hairline)] bg-[var(--ink-2)] p-6">
              <h2 className="font-display text-xl font-bold">What you get</h2>
              <ul className="mt-4 space-y-3 text-sm text-[var(--grey)]">
                {copy.whatYouGet.map((point) => (
                  <li key={point} className="border-l-2 border-[var(--cyan)] pl-3 text-[var(--white)]">
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {occasions.length > 0 && (
              <div className="border border-[var(--hairline)] bg-[var(--ink-2)] p-6">
                <h2 className="font-display text-lg font-bold">Occasions covered</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {occasions.map((occ) => (
                    <Link
                      key={occ.id}
                      href={`/book?kind=${kind}&occasion=${occ.id}`}
                      className="inline-flex min-h-[38px] items-center border border-[var(--control-border)] px-3 text-xs font-medium text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
                    >
                      {occ.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Packages Band */}
      <section className="border-t border-b border-[var(--hairline)] bg-[var(--ink-2)] py-14 text-[var(--white)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono-meta text-xs uppercase tracking-[0.12em] text-[var(--cyan)] font-bold">
                PACKAGES &amp; STARTING RATES
              </p>
              <h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl text-[var(--white)]">
                {copy.title} packages in GHS
              </h2>
            </div>
            <Link
              href={`/book?kind=${kind}`}
              className="text-sm font-semibold text-[var(--cyan)] underline underline-offset-4 hover:brightness-110"
            >
              Need a custom brief? Request a custom quote
            </Link>
          </div>

          {packages.length === 0 ? (
            <div className="mt-8 border border-[var(--hairline)] bg-[var(--black)] p-6">
              <p className="text-base font-medium text-[var(--white)]">
                {copy.title} pricing is prepared by custom quote. Tell us your scope and we will send an itemised breakdown within one working day.
              </p>
              <div className="mt-4">
                <ButtonLink href={`/book?kind=${kind}`} variant="cyan">
                  Request a custom quote
                </ButtonLink>
              </div>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="flex flex-col justify-between border border-[var(--hairline)] bg-[var(--black)] p-6 hm-card-interactive"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-xl font-bold text-[var(--white)]">{pkg.name}</h3>
                      {pkg.duration_hours && (
                        <span className="font-mono-meta text-xs uppercase px-2 py-0.5 rounded bg-[var(--ink-2)] border border-[var(--hairline)] text-[var(--grey)]">
                          {pkg.duration_hours} hrs
                        </span>
                      )}
                    </div>
                    <p className="mt-3 font-classica text-3xl font-extrabold text-[var(--cyan)]">
                      {formatGhsFromMinor(pkg.price_minor, pkg.currency)}
                    </p>
                    {pkg.summary && (
                      <p className="mt-2 text-sm text-[var(--grey)] leading-relaxed">{pkg.summary}</p>
                    )}
                    <ul className="mt-4 space-y-2 border-t border-[var(--hairline)] pt-4 text-sm">
                      {pkg.deliverables.map((d) => (
                        <li key={d} className="flex items-start gap-2 text-[var(--white)]">
                          <span aria-hidden="true" className="font-mono-meta font-bold text-[var(--cyan)]">
                            +
                          </span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-2">
                    <ButtonLink
                      href={`/book?kind=${kind}&service=${pkg.service_id}&package=${pkg.id}`}
                      variant="cyan"
                      className="w-full"
                    >
                      Select this package
                    </ButtonLink>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Related portfolio work */}
      {relatedWork.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-bold">
              Related {copy.title.toLowerCase()} work
            </h2>
            <Link
              href={`/portfolio?kind=${kind}`}
              className="text-sm font-medium text-[var(--cyan)] underline underline-offset-4"
            >
              Filter portfolio
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {relatedWork.slice(0, 4).map((item) => (
              <PortfolioTile key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
