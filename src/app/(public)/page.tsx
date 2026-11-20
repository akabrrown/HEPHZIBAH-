import type { Metadata } from "next";
import { ArrowRight, Camera, Film, Layers } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { PortfolioTile } from "@/components/ui/portfolio-tile";
import { FramingCorners, ShotCaption } from "@/components/ui/viewfinder";
import { getPublicSiteSettings } from "@/modules/catalog/service";
import { getPublicPortfolioList, getPublicTestimonials } from "@/modules/portfolio/service";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Hephzibah Media — Photography, Videography & Graphic Design",
  description:
    "Event and commercial photography, videography, and graphic design across Ghana. Judge the work and send a booking request in under three minutes.",
};

const SERVICE_PANELS = [
  {
    kind: "photography" as const,
    index: "01",
    title: "Photography",
    tagline: "Weddings, traditional ceremonies, funerals, corporate gatherings, and portraits.",
    deliverables: ["Colour-graded digital gallery", "Mixed venue lighting mastery", "Private client consent policy"],
    caption: "EVENT & PORTRAIT · ACCRA",
  },
  {
    kind: "videography" as const,
    index: "02",
    title: "Videography",
    tagline: "Multi-camera ceremony films, music videos, and founder documentaries with clean audio.",
    deliverables: ["Dual-system lapel & ambient audio", "Graded highlight & full film cuts", "4K & social-ready exports"],
    caption: "CINEMA & AUDIO · 4K 24FPS",
  },
  {
    kind: "design" as const,
    index: "03",
    title: "Graphic Design",
    tagline: "Brand marks, event programmes, flyers, and social campaign sets built to deadline.",
    deliverables: ["CMYK print-ready PDFs with bleed", "Campaign kits for web & WhatsApp", "Vector identity master files"],
    caption: "IDENTITY & PRINT · OSU",
  },
];

const DISCIPLINE_ICONS = {
  photography: Camera,
  videography: Film,
  design: Layers,
} as const;

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Send a structured request",
    body: "Pick the service, check open dates on our calendar, and share your brief or reference links.",
  },
  {
    step: "02",
    title: "Receive an itemised quote",
    body: "We review crew schedule and reply within one working day with exact GHS pricing and deliverables.",
  },
  {
    step: "03",
    title: "Accept and place deposit",
    body: "Approve your quote online from your private link and pay the deposit via Mobile Money or bank transfer.",
  },
  {
    step: "04",
    title: "Coverage and clean delivery",
    body: "Once your deposit is recorded, your date is locked and we deliver on the promised timeline.",
  },
];

export default async function HomePage() {
  const [settings, portfolio, testimonials] = await Promise.all([
    getPublicSiteSettings(),
    getPublicPortfolioList({ featuredOnly: true }),
    getPublicTestimonials(),
  ]);

  const featured = portfolio.slice(0, 4);

  return (
    <div>
      {/* Hero section: Compact full-bleed landscape background with studio team */}
      <section className="relative w-full min-h-[420px] sm:min-h-[460px] lg:min-h-[500px] flex items-center overflow-hidden border-b border-[var(--hairline)] bg-[#0A0A0B] text-white">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <picture>
            <source srcSet="/media/hephzibah-hero-bg.webp" type="image/webp" />
            <img
              src="/media/hephzibah-hero-bg.jpg"
              alt="Hephzibah Media production team holding camera and flash equipment in Accra, Ghana"
              className="h-full w-full object-cover object-[76%_22%] sm:object-[78%_22%] lg:object-[82%_20%]"
              loading="eager"
              fetchPriority="high"
            />
          </picture>

          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B]/95 via-[#0A0A0B]/70 to-[#0A0A0B]/30 md:bg-gradient-to-r md:from-[#0A0A0B]/95 md:via-[#0A0A0B]/70 md:via-48% md:to-transparent" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:py-14">
          <div className="max-w-lg lg:max-w-xl space-y-4">
            <p className="font-mono text-xs uppercase tracking-widest text-[#00E5FF] font-semibold">
              {settings.business_name} &middot; Accra, Ghana
            </p>

            <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl leading-[1.08]">
              Photography, film and design for the moments that matter.
            </h1>

            <p className="max-w-md text-sm sm:text-base leading-relaxed text-[#D2D6DC]">
              Weddings, corporate summits, portraits, and brand identity work produced by our Accra team. Itemised Ghana Cedi quotes, firm date locks, and reliable delivery.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <ButtonLink
                href="/book"
                variant="primary"
                className="px-6 py-3 text-sm font-bold focus-visible:ring-offset-[#0A0A0B]"
              >
                Request a booking
              </ButtonLink>
              <ButtonLink
                href="/portfolio"
                variant="secondaryLight"
                className="px-6 py-3 text-sm"
              >
                See client work
              </ButtonLink>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#C5CAD1]">
              <span>Two-camera lead crew</span>
              <span aria-hidden="true">&middot;</span>
              <span>Fixed GHS quotes</span>
              <span aria-hidden="true">&middot;</span>
              <span>Direct online gallery delivery</span>
            </div>
          </div>
        </div>
      </section>

      {/* Three services as large editorial panels */}
      <section className="border-t border-[var(--hairline)] bg-[var(--black)] py-14 sm:py-18">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <ShotCaption parts={["THREE DISCIPLINES", "ONE STUDIO DESK"]} />
              <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
                What we cover
              </h2>
            </div>
            <Link
              href="/services"
              className="inline-flex min-h-[44px] items-center text-sm font-medium text-[var(--cyan)] underline underline-offset-4"
            >
              Browse by occasion
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {SERVICE_PANELS.map((panel) => {
              const Icon = DISCIPLINE_ICONS[panel.kind];
              return (
                <FramingCorners
                  key={panel.kind}
                  className="group border border-[var(--hairline)] bg-[var(--ink-2)] hm-card-interactive"
                >
                  <Link
                    href={`/services/${panel.kind}`}
                    className="flex h-full flex-col justify-between p-6 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)]"
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[2px] border border-[var(--hairline)] bg-[var(--black)] text-[var(--cyan)]">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <span className="font-mono-meta text-xs font-bold tracking-widest text-[var(--grey)]">
                          {panel.index}
                        </span>
                      </div>
                      <ShotCaption parts={[panel.caption]} className="mt-4" />
                      <h3 className="mt-2 font-display text-2xl font-bold text-[var(--white)] group-hover:text-[var(--cyan)] transition-colors">
                        {panel.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--grey)]">
                        {panel.tagline}
                      </p>
                      <ul className="mt-4 space-y-1.5 border-t border-[var(--hairline)] pt-4 text-xs text-[var(--grey)]">
                        {panel.deliverables.map((item) => (
                          <li key={item} className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 shrink-0 bg-[var(--cyan)]" aria-hidden="true" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <span className="mt-6 inline-flex items-center gap-2 font-mono-meta text-xs uppercase tracking-wider text-[var(--cyan)]">
                      Explore {panel.title.toLowerCase()}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </span>
                  </Link>
                </FramingCorners>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured portfolio */}
      {featured.length > 0 && (
        <section className="border-t border-[var(--hairline)] py-14 sm:py-18">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <ShotCaption parts={["SELECTED ARCHIVE", "CLIENT-CONSENTED WORK"]} />
                <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
                  Recent commissions
                </h2>
              </div>
              <Link
                href="/portfolio"
                className="inline-flex min-h-[44px] items-center text-sm font-medium text-[var(--cyan)] underline underline-offset-4"
              >
                All portfolio work
              </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
              {featured.map((item) => (
                <PortfolioTile key={item.id} item={item} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works in four steps */}
      <section className="border-t border-[var(--hairline)] bg-[var(--ink-2)] py-14 sm:py-18">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <ShotCaption parts={["BOOKING FLOW", `${settings.min_lead_days}-DAY LEAD TIME`]} />
          <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
            How booking works
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((item) => (
              <div
                key={item.step}
                className="group border border-[var(--hairline)] bg-[var(--black)] p-5 hm-card-interactive"
              >
                <div>
                  <p className="font-mono-meta text-xs tracking-widest text-[var(--cyan)] font-bold">
                    STEP {item.step}
                  </p>
                </div>
                <h3 className="mt-2 font-display text-lg font-bold text-[var(--white)] group-hover:text-[var(--cyan)] transition-colors">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--grey)]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Approved client testimonials */}
      {testimonials.length > 0 && (
        <section className="border-t border-[var(--hairline)] py-14 sm:py-18">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <ShotCaption parts={["CLIENT NOTES", "APPROVED WORDS"]} />
                <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
                  From past clients
                </h2>
              </div>
              <Link
                href="/testimonials"
                className="inline-flex min-h-[44px] items-center text-sm font-medium text-[var(--cyan)] underline underline-offset-4"
              >
                Read all testimonials
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.slice(0, 3).map((t) => (
                <blockquote
                  key={t.id}
                  className="flex flex-col justify-between border border-[var(--hairline)] bg-[var(--ink-2)] p-6 hm-card-interactive"
                >
                  <p className="text-sm leading-relaxed text-[var(--white)]">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <footer className="mt-5 border-t border-[var(--hairline)] pt-3">
                    <p className="text-sm font-semibold text-[var(--white)]">
                      {t.author_name}
                    </p>
                    {t.author_context && (
                      <p className="font-mono-meta text-xs uppercase text-[var(--grey)]">
                        {t.author_context}
                      </p>
                    )}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Closing action */}
      <section className="border-t border-[var(--hairline)] bg-[var(--ink-2)] py-14">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-4 sm:px-6">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Have a date or deadline in mind?
            </h2>
            <p className="mt-2 text-sm text-[var(--grey)]">
              This is a request, not a commitment. We reply within one working day.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/pricing" variant="secondary">
              View packages
            </ButtonLink>
            <ButtonLink href="/book" variant="secondary">
              Request a booking
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
