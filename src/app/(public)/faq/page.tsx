import type { Metadata } from "next";
import { FaqAccordion } from "@/components/faq/faq-accordion";
import { ButtonLink } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { getPublicFaqs } from "@/modules/portfolio/service";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers about booking dates, Mobile Money deposits, delivery timelines, copyright, and rescheduling with Hephzibah Media.",
};

export default async function FaqPage() {
  const faqs = await getPublicFaqs();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 space-y-8">
      <header className="space-y-4">
        <PageHeading
          title="FAQ"
          ghostTitle="FAQ"
          description="Straight answers on how quotes, dates, deposits, and delivery work."
        />
        <h2 className="font-display text-xl font-bold text-[var(--white)]">
          Common questions
        </h2>
      </header>

      <FaqAccordion faqs={faqs} />

      <div className="border border-[var(--hairline)] bg-[var(--ink-2)] p-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-[var(--grey)]">
          Still have a specific question about your event or brief?
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/contact" variant="secondary">
            Send an enquiry
          </ButtonLink>
          <ButtonLink href="/book" variant="ghost">
            Request a booking
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
