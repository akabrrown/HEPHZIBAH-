import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { PortfolioTile } from "@/components/ui/portfolio-tile";
import { FramingCorners, ShotCaption } from "@/components/ui/viewfinder";
import { getPublicSiteSettings } from "@/modules/catalog/service";
import { getPublicPortfolioList, getPublicTestimonials } from "@/modules/portfolio/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hephzibah Media — Photography, Videography & Graphic Design",
  description:
    "Event and commercial photography, videography, and graphic design across Ghana. Judge the work and send a booking request in under three minutes.",
};

const SERVICE_PANELS = [
  {
    kind: "photography" as const,
    title: "Photography",
    tagline: "Weddings, traditional ceremonies, funerals, corporate gatherings, and portraits.",
    image: "/media/cathedral-wedding-cover.svg",
    alt: "Wide architectural frame of wedding guests applauding as the couple walks down the aisle",
    caption: "EVENT & PORTRAIT / ACCRA / NATIVE RATIO",
  },
  {
    kind: "videography" as const,
    title: "Videography",
    tagline: "Multi-camera ceremony films, music videos, and founder documentaries with clean audio.",
    image: "/media/videography-showreel-poster.svg",
    alt: "Still frame from live acoustic performance session in Labone courtyard",
    caption: "CINEMA & AUDIO / 4K 24FPS / SHOWREEL",
  },
  {
    kind: "design" as const,
    title: "Graphic Design",
    tagline: "Brand marks, event programmes, flyers, and social campaign sets built to deadline.",
    image: "/media/design-identity-cover.svg",
    alt: "Monochrome brand identity mark and packaging grid for Gold Coast Roasters",
    caption: "IDENTITY & PRINT / OSU / VECTOR & PRINT",
  },
];

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
      {/* Hero section: Studio editorial showcase with full-fidelity Ghana Robotics crew photograph */}
      <section className="relative w-full overflow-hidden border-b border-[var(--hairline)] bg-[var(--black)] text-[var(--white)]">
        {/* Subtle atmospheric ambient glow from the crew assignment image */}
        <div className="absolute inset-0 z-0 opacity-15 dark:opacity-20 pointer-events-none overflow-hidden" aria-hidden="true">
          <picture>
            <source srcSet="/media/hephzibah-hero-crew.webp" type="image/webp" />
            <img
              src="/media/hephzibah-hero-crew.jpg"
              alt=""
              className="h-full w-full object-cover blur-3xl scale-110"
            />
          </picture>
        </div>

        {/* Framing Corners (Electric Cyan 2px L-brackets) */}
        <div className="pointer-events-none absolute inset-3 sm:inset-6 z-10">
          <span className="vf-corner vf-corner-tl opacity-80" />
          <span className="vf-corner vf-corner-tr opacity-80" />
          <span className="vf-corner vf-corner-bl opacity-80" />
          <span className="vf-corner vf-corner-br opacity-80" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Left: Studio Editorial Narrative & CTAs */}
            <div className="space-y-6 lg:col-span-7">
              <PageHeading
                title={settings.business_name}
                ghostTitle="HEPHZIBAH"
              />

              <h1 className="font-display text-3xl font-extrabold tracking-tight text-[var(--white)] sm:text-4xl lg:text-5xl leading-tight">
                Photography, film and design for the moments that matter.
              </h1>

              <p className="max-w-xl text-base sm:text-lg leading-relaxed text-[var(--grey)]">
                From live national robotics championships and high-profile summits to sacred traditional marriages and brand identity design. We deliver disciplined Ghanaian visual craft with honest date locks and transparent Ghana Cedi quotes.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <ButtonLink
                  href="/book"
                  variant="cyan"
                  className="shadow-[0_0_25px_rgba(0,229,255,0.35)] px-7 py-3 text-sm font-extrabold"
                >
                  Request a booking
                </ButtonLink>
                <ButtonLink
                  href="/portfolio"
                  variant="secondary"
                  className="px-6 py-3 text-sm"
                >
                  See client work
                </ButtonLink>
              </div>
            </div>

            {/* Right: Full-Fidelity Photographic Viewfinder Showcase (100% of photo visible, uncropped) */}
            <div className="lg:col-span-5">
              <div className="relative overflow-hidden rounded-[2px] border border-[var(--hairline)] bg-[var(--ink-2)] p-2.5 sm:p-3 shadow-2xl transition-all hover:border-[var(--cyan)]/60">
                {/* Viewfinder Top HUD */}
                <div className="mb-2.5 flex items-center justify-between border-b border-[var(--hairline)] px-1 pb-2">
                  <span className="font-mono text-[10px] font-bold tracking-wider text-[var(--cyan)] uppercase">
                    LIVE FRAME
                  </span>
                  <span className="font-mono text-[10px] font-semibold text-[var(--grey)] uppercase tracking-wider">
                    HEPHZIBAH CREW · ON SET
                  </span>
                </div>

                {/* The Complete Uncropped Photo in Native Ratio */}
                <div className="relative aspect-[1024/981] w-full overflow-hidden rounded-[1px] bg-[var(--black)]">
                  <picture>
                    <source srcSet="/media/hephzibah-hero-crew.webp" type="image/webp" />
                    <img
                      src="/media/hephzibah-hero-crew.jpg"
                      alt="Hephzibah Media production crew with camera and lighting rig on assignment at Ghana Robotics Competition"
                      className="h-full w-full object-cover"
                      loading="eager"
                      fetchPriority="high"
                    />
                  </picture>
                </div>

                {/* Viewfinder Bottom Caption */}
                <div className="mt-2.5 flex items-center justify-between px-1 pt-1 font-mono text-[10px] text-[var(--grey)]">
                  <span>GHANA ROBOTICS CHAMPIONSHIP</span>
                  <span className="text-[var(--cyan)] font-bold">ACCRA · GHANA</span>
                </div>
              </div>
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
            {SERVICE_PANELS.map((panel) => (
              <FramingCorners
                key={panel.kind}
                className="group border border-[var(--hairline)] bg-[var(--ink-2)] hm-card-interactive"
              >
                <Link href={`/services/${panel.kind}`} className="block p-4">
                  <div className="aspect-[16/10] w-full overflow-hidden bg-[var(--black)]">
                    <img
                      src={panel.image}
                      alt={panel.alt}
                      width={1600}
                      height={1000}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
                    />
                  </div>
                  <ShotCaption parts={[panel.caption]} className="mt-3" />
                  <h3 className="mt-1.5 font-display text-xl font-bold text-[var(--white)] group-hover:text-[var(--cyan)] transition-colors">
                    {panel.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--grey)]">
                    {panel.tagline}
                  </p>
                </Link>
              </FramingCorners>
            ))}
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
