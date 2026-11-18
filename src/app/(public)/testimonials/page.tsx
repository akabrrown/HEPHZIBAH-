import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { getPublicTestimonials } from "@/modules/portfolio/service";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Client Testimonials",
  description: "Verified client reflections approved for publication by Hephzibah Media clients.",
};

export default async function TestimonialsPage() {
  const testimonials = await getPublicTestimonials();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 space-y-10">
      <header className="max-w-3xl space-y-4">
        <PageHeading
          title="Testimonials"
          ghostTitle="TESTIMONIALS"
          description="Every quote below was shared and approved by the client who commissioned the work."
        />
        <h2 className="font-display text-xl font-bold text-[var(--white)]">
          Words from clients
        </h2>
      </header>

      {testimonials.length === 0 ? (
        <div className="border border-[var(--hairline)] bg-[var(--ink-2)] p-8">
          <p className="text-sm text-[var(--grey)]">
            Client testimonials are being added. Explore our published portfolio work in the meantime.
          </p>
          <div className="mt-4">
            <ButtonLink href="/portfolio" variant="secondary">
              Browse portfolio
            </ButtonLink>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <blockquote
              key={t.id}
              className="flex flex-col justify-between border border-[var(--hairline)] bg-[var(--ink-2)] p-6"
            >
              <p className="text-sm leading-relaxed text-[var(--white)]">
                &ldquo;{t.quote}&rdquo;
              </p>
              <footer className="mt-6 border-t border-[var(--hairline)] pt-3">
                <p className="font-semibold text-[var(--white)]">{t.author_name}</p>
                {t.author_context && (
                  <p className="font-mono-meta text-xs uppercase text-[var(--grey)]">
                    {t.author_context}
                  </p>
                )}
              </footer>
            </blockquote>
          ))}
        </div>
      )}
    </div>
  );
}
