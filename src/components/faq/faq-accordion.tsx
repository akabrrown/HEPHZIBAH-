"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import type { FaqItem } from "@/modules/portfolio/schema";

export function FaqAccordion({ faqs }: { faqs: FaqItem[] }) {
  return (
    <Accordion.Root type="multiple" className="divide-y divide-[var(--hairline)] border border-[var(--hairline)] bg-[var(--ink-2)]">
      {faqs.map((faq) => (
        <Accordion.Item
          key={faq.id}
          value={faq.id}
          className="transition-colors data-[state=open]:bg-[var(--black)]/40 data-[state=open]:border-l-2 data-[state=open]:border-l-[var(--cyan)]"
        >
          <h2 className="m-0">
            <Accordion.Trigger className="group flex min-h-[56px] w-full items-center justify-between gap-4 px-5 py-4 text-left font-display text-base font-bold text-[var(--white)] hover:text-[var(--cyan)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] cursor-pointer sm:text-lg">
              <span>{faq.question}</span>
              <ChevronDown
                className="h-5 w-5 shrink-0 text-[var(--grey)] transition-transform duration-150 group-data-[state=open]:rotate-180 group-data-[state=open]:text-[var(--cyan)]"
                aria-hidden="true"
              />
            </Accordion.Trigger>
          </h2>
          <Accordion.Content className="px-5 pb-5 text-sm leading-relaxed text-[var(--grey)]">
            {faq.answer}
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
