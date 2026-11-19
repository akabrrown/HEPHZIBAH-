import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { ShotCaption } from "@/components/ui/viewfinder";
import { getPublicSiteSettings } from "@/modules/catalog/service";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "About",
  description:
    "How the Hephzibah Media crew prepares, shoots, and delivers photography, videography, and graphic design across Ghana.",
};

export default async function AboutPage() {
  const settings = await getPublicSiteSettings();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 space-y-12">
      <header className="grid gap-8 lg:grid-cols-12 items-start">
        <div className="lg:col-span-6 space-y-4">
          <PageHeading
            title="About"
            ghostTitle="ABOUT"
            description="Prepared before the day begins, quiet while it unfolds. Event photography, multi-camera videography, and graphic design across Ghana."
          />
          <h2 className="font-display text-xl font-bold text-[var(--white)] pt-2">
            Prepared before the day begins, quiet while it unfolds.
          </h2>
          <p className="text-base leading-relaxed text-[var(--grey)]">
            {settings.business_name} is a Ghanaian visual studio built around three linked crafts: event and commercial photography, multi-camera videography, and graphic design. We handle occasions where dates are fixed and emotion runs high — weddings, traditional marriages, outdoorings, and memorials — alongside corporate conferences and brand launches.
          </p>
        </div>

        <div className="lg:col-span-6 border border-[var(--hairline)] bg-[var(--ink-2)] p-3">
          <div className="aspect-[1500/1000] w-full overflow-hidden bg-[var(--black)]">
            <picture>
              <source srcSet="/media/hephzibah-hero-crew.webp" type="image/webp" />
              <img
                src="/media/hephzibah-hero-crew.jpg"
                alt="Hephzibah Media studio production crew on assignment with mirrorless camera rig"
                width={1500}
                height={1000}
                className="h-full w-full object-cover"
                loading="eager"
              />
            </picture>
          </div>
          <ShotCaption parts={["STUDIO CREW", "ONE CREW PER TIME WINDOW"]} className="mt-3" />
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-3 border-t border-[var(--hairline)] pt-10">
        <div className="group border border-[var(--hairline)] bg-[var(--ink-2)] p-6 space-y-2 hm-card-interactive">
          <h2 className="font-display text-lg font-bold text-[var(--white)] group-hover:text-[var(--cyan)] transition-colors">How the crew works</h2>
          <p className="text-sm leading-relaxed text-[var(--grey)]">
            We run one confirmed shoot per time window so your ceremony never shares attention with a second booking across town.
          </p>
        </div>
        <div className="group border border-[var(--hairline)] bg-[var(--ink-2)] p-6 space-y-2 hm-card-interactive">
          <h2 className="font-display text-lg font-bold text-[var(--white)] group-hover:text-[var(--cyan)] transition-colors">Equipment philosophy</h2>
          <p className="text-sm leading-relaxed text-[var(--grey)]">
            Dual-card mirrorless bodies, dedicated lapel audio capture, and redundant local backups from the night of the shoot.
          </p>
        </div>
        <div className="group border border-[var(--hairline)] bg-[var(--ink-2)] p-6 space-y-2 hm-card-interactive">
          <h2 className="font-display text-lg font-bold text-[var(--white)] group-hover:text-[var(--cyan)] transition-colors">Respect for privacy</h2>
          <p className="text-sm leading-relaxed text-[var(--grey)]">
            Client images are never uploaded publicly without explicit permission. Private ceremonies stay private.
          </p>
        </div>
      </section>

      <section className="border border-[var(--hairline)] bg-[var(--ink-2)] p-6 flex flex-wrap items-center justify-between gap-4 hm-card-interactive">
        <div>
          <h2 className="font-display text-xl font-bold">Ready to share your brief?</h2>
          <p className="mt-1 text-sm text-[var(--grey)]">
            Check our open dates or reach us on WhatsApp first.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/book" variant="cyan">
            Request a booking
          </ButtonLink>
          <ButtonLink href="/contact" variant="secondary">
            Contact desk
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
