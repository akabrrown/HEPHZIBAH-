import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Camera, Film, Layers } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { FramingCorners, ShotCaption } from "@/components/ui/viewfinder";
import { formatGhsFromMinor } from "@/lib/money";
import { getPublicCatalogue } from "@/modules/catalog/service";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Services & Occasions",
  description:
    "Photography, videography, and graphic design services across weddings, traditional marriages, outdoorings, memorials, corporate events, and brand campaigns.",
};

const KIND_LABELS = {
  photography: "Photography",
  videography: "Videography",
  design: "Graphic design",
} as const;

const DISCIPLINE_ICONS = {
  photography: Camera,
  videography: Film,
  design: Layers,
} as const;

const DISCIPLINE_SPECS = {
  photography: "Direct Still Capture · Lens Optic",
  videography: "Cinematic Motion · 4K 10-Bit Log",
  design: "Visual Identity · Print & Digital Assets",
} as const;

const DISCIPLINE_LOGOS = {
  photography: {
    src: "/media/logo-hephzibah-photography.jpg",
    alt: "Hephzibah Photography official brand logo",
  },
  videography: {
    src: "/media/logo-hephzibah-videography.jpg",
    alt: "Hephzibah Videography official brand logo",
  },
} as const;

export default async function ServicesHubPage() {
  const { occasions, services } = await getPublicCatalogue();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="max-w-3xl mb-8">
        <PageHeading
          title="Services"
          ghostTitle="SERVICES"
          description="Whether you are coordinating a family ceremony, a memorial thanksgiving, a corporate conference, or a brand launch, start from your occasion or pick a studio discipline below."
        />
        <h2 className="mt-4 font-display text-xl font-bold text-[var(--white)]">
          Services shaped around the day you are planning
        </h2>
      </div>

      {/* Three discipline panels */}
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {(["photography", "videography", "design"] as const).map((kind) => {
          const kindServices = services.filter((s) => s.kind === kind);
          const Icon = DISCIPLINE_ICONS[kind];
          const logo = kind === "design" ? null : DISCIPLINE_LOGOS[kind];
          return (
            <FramingCorners
              key={kind}
              className="group flex flex-col overflow-hidden border border-[var(--hairline)] bg-[var(--ink-2)] hm-card-interactive"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-[var(--hairline)] bg-black">
                {logo ? (
                  <Image
                    src={logo.src}
                    alt={logo.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-contain p-4 transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center p-5 text-center text-white select-none transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/5 text-white">
                      <Layers className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <p className="font-serif text-2xl leading-none tracking-tight text-white">
                      Hephzibah
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="h-[2px] w-6 bg-[#E0101F]" aria-hidden="true" />
                      <span className="font-serif italic text-sm tracking-wide text-white/95">
                        Graphic Design
                      </span>
                      <span className="h-[2px] w-6 bg-[#E0101F]" aria-hidden="true" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col p-6">
                <div className="mb-5 border-b border-[var(--hairline)] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[2px] border border-[var(--hairline)] bg-[var(--black)] text-[var(--cyan)]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <span className="block font-mono-meta text-[10px] uppercase tracking-wider text-[var(--grey)]">
                        {DISCIPLINE_SPECS[kind]}
                      </span>
                      <span className="block font-mono-meta text-xs font-semibold text-[var(--white)]">
                        {kindServices.length} STUDIO OFFERINGS
                      </span>
                    </div>
                  </div>
                </div>
                <ShotCaption parts={[kind, `${kindServices.length} SUB-SERVICES`]} />
                <h2 className="mt-2 font-display text-2xl font-bold text-[var(--white)]">
                  {KIND_LABELS[kind]}
                </h2>
                <ul className="mt-4 space-y-1.5 border-t border-[var(--hairline)] pt-4 flex-1">
                  {kindServices.length === 0 ? (
                    <li className="py-2 text-sm text-[var(--grey)]">
                      Packages for this discipline are listed in your quote after inquiry.
                    </li>
                  ) : (
                    kindServices.map((svc) => (
                      <li key={svc.id} className="flex items-baseline justify-between gap-3 text-sm">
                        <Link
                          href={`/book?kind=${kind}&service=${svc.id}`}
                          className="inline-flex min-h-[44px] items-center text-[var(--white)] hover:text-[var(--cyan)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)]"
                        >
                          {svc.name}
                        </Link>
                        {svc.starting_price_minor !== null && (
                          <span className="font-mono-meta text-xs font-bold text-[var(--cyan)] shrink-0">
                            From {formatGhsFromMinor(svc.starting_price_minor)}
                          </span>
                        )}
                      </li>
                    ))
                  )}
                </ul>
                <div className="mt-6">
                  <ButtonLink href={`/services/${kind}`} variant="secondary" className="w-full">
                    Explore {KIND_LABELS[kind].toLowerCase()}
                  </ButtonLink>
                </div>
              </div>
            </FramingCorners>
          );
        })}
      </div>

      {/* Occasion-led navigation */}
      <section className="mt-14 border-t border-[var(--hairline)] pt-12">
        <ShotCaption parts={["OCCASIONS COVERED", "GHANA-WIDE"]} />
        <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
          Start by occasion
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--grey)]">
          For funerals and memorials: we are here to document the day with care. Pick any occasion below to open the booking form with it ready.
        </p>

        {occasions.length === 0 ? (
          <p className="mt-6 border border-[var(--hairline)] bg-[var(--ink-2)] p-6 text-sm text-[var(--grey)]">
            No occasion presets listed right now. Choose any discipline above to start your booking brief.
          </p>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {occasions.map((occ) => {
              const primaryKind = occ.applies_to[0] ?? "photography";
              return (
                <Link
                  key={occ.id}
                  href={`/book?kind=${primaryKind}&occasion=${occ.id}`}
                  className="group flex min-h-[56px] items-center justify-between border border-[var(--hairline)] bg-[var(--ink-2)] px-4 py-3 hover:border-[var(--cyan)] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)]"
                >
                  <span className="font-medium text-[var(--white)] group-hover:text-[var(--cyan)] transition-colors">{occ.name}</span>
                  <span className="font-mono-meta text-xs uppercase text-[var(--grey)] group-hover:text-[var(--cyan)] transition-colors">
                    {occ.applies_to.join(" · ")} &rarr;
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
