import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { FramingCorners } from "@/components/ui/viewfinder";
import { formatGhsFromMinor } from "@/lib/money";
import { serviceKindValues, type ServiceKind } from "@/modules/catalog/schema";
import { getPublicCatalogue } from "@/modules/catalog/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Packages and Pricing",
  description:
    "Clear starting packages in Ghana Cedis (GHS) for photography, videography, and graphic design, plus bespoke quotes.",
};

const KIND_TITLES: Record<ServiceKind, string> = {
  photography: "Photography packages",
  videography: "Videography packages",
  design: "Graphic design packages",
};

export default async function PricingPage() {
  const { packages } = await getPublicCatalogue();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="max-w-3xl border-b border-[var(--hairline)] pb-8 mb-10">
        <PageHeading
          title="Packages and pricing"
          ghostTitle="PRICING"
          description="Packages below show starting coverage in Ghana Cedis. Once you submit a booking request, we confirm an itemised quote for your exact hours, travel outside Accra, or extra deliverables — and those quoted prices stay frozen while your quote is valid."
        />
      </div>

      {packages.length === 0 ? (
        <div className="mt-10 border border-[var(--hairline)] bg-[var(--ink-2)] p-8 hm-card-interactive">
          <h2 className="font-display text-xl font-bold text-[var(--white)]">Pricing by bespoke quote</h2>
          <p className="mt-2 text-sm text-[var(--grey)]">
            Tell us about your event or design deadline and we will send an itemised quote within one working day.
          </p>
          <div className="mt-5">
            <ButtonLink href="/book" variant="cyan">
              Request a bespoke quote
            </ButtonLink>
          </div>
        </div>
      ) : (
        <div className="space-y-14">
          {serviceKindValues.map((kind) => {
            const kindPkgs = packages.filter((p) => p.service_kind === kind);
            if (kindPkgs.length === 0) return null;

            return (
              <section key={kind}>
                <div className="mb-6">
                  <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-[var(--white)]">
                    {KIND_TITLES[kind]}
                  </h2>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {kindPkgs.map((pkg) => (
                    <FramingCorners
                      key={pkg.id}
                      className="group flex flex-col justify-between border border-[var(--hairline)] bg-[var(--ink-2)] p-6 hm-card-interactive hover:border-[var(--cyan)]/60"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 border-b border-[var(--hairline)] pb-3">
                          <p className="font-mono-meta text-xs uppercase tracking-wider text-[var(--cyan)] font-bold">
                            {pkg.service_name}
                          </p>
                          {pkg.duration_hours && (
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[var(--black)] border border-[var(--hairline)] text-[var(--white)]">
                              {pkg.duration_hours} hrs
                            </span>
                          )}
                        </div>

                        <h3 className="mt-3 font-display text-xl font-bold text-[var(--white)] group-hover:text-[var(--cyan)] transition-colors">
                          {pkg.name}
                        </h3>

                        <p className="mt-3 font-classica text-3xl font-black text-[var(--cyan)] drop-shadow-[0_0_15px_rgba(0,229,255,0.25)]">
                          {formatGhsFromMinor(pkg.price_minor, pkg.currency)}
                        </p>

                        {pkg.summary && (
                          <p className="mt-2 text-sm leading-relaxed text-[var(--grey)]">
                            {pkg.summary}
                          </p>
                        )}

                        <ul className="mt-5 space-y-2 border-t border-[var(--hairline)] pt-4 text-sm">
                          {pkg.deliverables.map((d) => (
                            <li key={d} className="flex items-start gap-2.5 text-[var(--white)]">
                              <span aria-hidden="true" className="font-mono-meta font-black text-[var(--cyan)]">
                                +
                              </span>
                              <span>{d}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-8 pt-2">
                        <ButtonLink
                          href={`/book?kind=${kind}&service=${pkg.service_id}&package=${pkg.id}`}
                          variant="cyan"
                          className="w-full justify-center shadow-[0_0_15px_rgba(0,229,255,0.2)]"
                        >
                          Book with this package
                        </ButtonLink>
                      </div>
                    </FramingCorners>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <section className="mt-16 border-t border-[var(--hairline)] pt-10">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="border border-[var(--hairline)] bg-[var(--ink-2)] p-6 hm-card-interactive">
            <h2 className="font-display text-xl font-bold text-[var(--white)] mb-3">What can change a quote</h2>
            <ul className="space-y-2 text-sm text-[var(--grey)]">
              <li className="flex items-start gap-2">
                <span className="text-[var(--cyan)] font-mono">&bull;</span>
                <span>Extra hours beyond the package window or multi-day ceremonies</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--cyan)] font-mono">&bull;</span>
                <span>Locations outside Greater Accra requiring crew travel and lodging</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--cyan)] font-mono">&bull;</span>
                <span>Additional camera operators, printed photobooks, or rush turnarounds</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col justify-between border border-[var(--hairline)] bg-[var(--ink-2)] p-6 hm-card-interactive">
            <div>
              <h2 className="font-display text-xl font-bold text-[var(--white)] mb-3">Need something bespoke?</h2>
              <p className="text-sm leading-relaxed text-[var(--grey)]">
                Choose &ldquo;Not sure yet&rdquo; in the booking form and describe your brief. We will send an itemised quote you can share with family or finance teams.
              </p>
            </div>
            <div className="mt-6">
              <ButtonLink href="/book" variant="secondary" className="w-full justify-center">
                Request a bespoke quote
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
