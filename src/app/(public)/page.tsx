import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
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
      {/* Hero section: Cinematic Full-Landscape Viewfinder with Background Image */}
      <section className="relative w-full min-h-[85vh] sm:min-h-[88vh] lg:min-h-[92vh] flex items-center overflow-hidden border-b border-[var(--hairline)] bg-[var(--black)] text-[var(--white)]">
        {/* Full-bleed landscape background image layer */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <picture>
            <source srcSet="/media/hephzibah-hero-bg.webp" type="image/webp" />
            <img
              src="/media/hephzibah-hero-bg.jpg"
              alt="Hephzibah Media production crew with camera equipment on assignment in Accra, Ghana"
              className="h-full w-full object-cover object-[center_22%] sm:object-[center_20%] md:object-[68%_center] lg:object-[65%_center] scale-100"
              loading="eager"
              fetchPriority="high"
            />
          </picture>

          {/* Cinematic dark gradients for pristine text readability while leaving subjects visible */}
          <div className="absolute inset-0 bg-black/45" />

          {/* Directional gradient: Heavy dark fade on left (desktop), vertical fade from bottom (mobile) */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--black)] via-[var(--black)]/80 via-60% to-[var(--black)]/40 lg:bg-gradient-to-r lg:from-[var(--black)] lg:via-[var(--black)]/85 lg:via-52% lg:to-black/20" />

          {/* Top and bottom subtle vignettes */}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[var(--black)]/80 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[var(--black)] to-transparent" />

          {/* Subtle camera sensor grid overlay */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-overlay bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>

        {/* Viewfinder corner brackets framing the entire hero viewport */}
        <div className="pointer-events-none absolute left-4 top-4 sm:left-8 sm:top-8 h-6 w-6 border-l-2 border-t-2 border-[var(--cyan)] z-10" aria-hidden="true" />
        <div className="pointer-events-none absolute right-4 top-4 sm:right-8 sm:top-8 h-6 w-6 border-r-2 border-t-2 border-[var(--cyan)] z-10" aria-hidden="true" />
        <div className="pointer-events-none absolute left-4 bottom-4 sm:left-8 sm:bottom-8 h-6 w-6 border-l-2 border-b-2 border-[var(--cyan)] z-10" aria-hidden="true" />
        <div className="pointer-events-none absolute right-4 bottom-4 sm:right-8 sm:bottom-8 h-6 w-6 border-r-2 border-b-2 border-[var(--cyan)] z-10" aria-hidden="true" />

        {/* Hero Content Container */}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
          <div className="max-w-2xl lg:max-w-3xl space-y-6">
            {/* Camera Shot Metadata Line & Live HUD Badge */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2.5 rounded-[2px] border border-[var(--hairline)] bg-[var(--black)]/80 px-3 py-1.5 backdrop-blur-md text-xs font-mono uppercase tracking-widest text-[var(--cyan)]">
                <span className="inline-block h-2 w-2 rounded-full bg-[var(--cyan)] shadow-[0_0_8px_var(--cyan)]" />
                <span>HEPHZIBAH MEDIA // FIELD CREW // GHANA</span>
              </div>

              {/* REC telemetry badge */}
              <div className="hidden sm:inline-flex items-center gap-2 rounded-[2px] border border-[var(--hairline)] bg-[var(--black)]/80 px-3 py-1.5 backdrop-blur-md font-mono text-[11px] tracking-wider text-[var(--grey)]">
                <span className="h-2 w-2 rounded-full bg-[var(--red)] animate-pulse" />
                <span className="font-bold text-white">REC [●]</span>
                <span className="text-[var(--cyan)] font-mono">PRIMARY RIG // 4K RAW</span>
              </div>
            </div>

            {/* Main Headline & Ghost Title */}
            <div className="space-y-3">
              <PageHeading
                title={settings.business_name}
                ghostTitle="HEPHZIBAH"
              />

              <h1 className="font-display text-3xl font-extrabold tracking-tight text-[var(--white)] sm:text-5xl lg:text-6xl xl:text-6xl leading-[1.06]">
                Photography, film and design for the moments that matter.
              </h1>
            </div>

            <p className="max-w-xl text-base sm:text-lg leading-relaxed text-[var(--grey)] [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
              From live national robotics championships and high-profile summits to sacred traditional marriages and brand identity design. We deliver disciplined Ghanaian visual craft with honest date locks and transparent Ghana Cedi quotes.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <ButtonLink
                href="/book"
                variant="primary"
                className="px-8 py-3.5 text-sm font-extrabold shadow-lg shadow-black/50"
              >
                Request a booking
              </ButtonLink>
              <ButtonLink
                href="/portfolio"
                variant="secondary"
                className="px-7 py-3.5 text-sm backdrop-blur-md bg-black/40 border-[var(--control-border)] hover:border-[var(--cyan)]"
              >
                See client work
              </ButtonLink>
            </div>

            {/* Studio Instrument Readouts / Guarantees Bar */}
            <div className="mt-8 grid grid-cols-3 gap-4 rounded-[2px] border border-[var(--hairline)] bg-[var(--black)]/75 p-4 sm:p-5 backdrop-blur-md text-left shadow-2xl">
              <div>
                <div className="font-mono text-xs font-semibold text-[var(--cyan)]">01 / CREW</div>
                <div className="mt-1 font-display text-sm font-bold text-white">Dedicated Team</div>
                <div className="text-[11px] text-[var(--grey)]">Two-camera coverage</div>
              </div>
              <div>
                <div className="font-mono text-xs font-semibold text-[var(--cyan)]">02 / QUOTE</div>
                <div className="mt-1 font-display text-sm font-bold text-white">48-Hr Lock</div>
                <div className="text-[11px] text-[var(--grey)]">Fixed Cedi pricing</div>
              </div>
              <div>
                <div className="font-mono text-xs font-semibold text-[var(--cyan)]">03 / ARCHIVE</div>
                <div className="mt-1 font-display text-sm font-bold text-white">4K & RAW</div>
                <div className="text-[11px] text-[var(--grey)]">Lifetime cloud backup</div>
              </div>
            </div>
          </div>
        </div>

        {/* Viewfinder Bottom Status Line */}
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 hidden sm:flex items-center justify-between px-8 text-[11px] font-mono text-[var(--grey)]">
          <span>OPTICS: 24-70mm f/2.8 &bull; 1/250s &bull; ISO 400</span>
          <span className="text-[var(--cyan)]">LOCATION: ACCRA, GHANA &bull; ACTIVE STUDIO</span>
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
