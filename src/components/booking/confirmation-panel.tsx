"use client";

import { CheckCircle2, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { ShotCaption } from "@/components/ui/viewfinder";
import { buildWhatsAppUrl, formatDisplayDate } from "@/lib/dates";

interface ConfirmationCache {
  reference: string;
  statusUrl?: string;
  serviceName: string;
  packageName: string | null;
  dateLabel: string;
  clientName: string;
  clientEmail: string;
}

export function ConfirmationPanel({
  reference,
  whatsappE164,
  businessName,
}: {
  reference: string;
  whatsappE164: string;
  businessName: string;
}) {
  const [summary, setSummary] = useState<ConfirmationCache | null>(null);
  const [checkedStorage, setCheckedStorage] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`hm_booking_confirmed_${reference}`);
      if (raw) {
        setSummary(JSON.parse(raw) as ConfirmationCache);
        // Shown once after submit per App Flow section 11: clear so subsequent reload stays neutral
        sessionStorage.removeItem(`hm_booking_confirmed_${reference}`);
      }
    } catch {
      // Ignore storage read failure
    }
    setCheckedStorage(true);
  }, [reference]);

  const waUrl = buildWhatsAppUrl(
    whatsappE164,
    `Hello ${businessName}, I just sent booking request ${reference}.`
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div className="border border-[var(--hairline)] bg-[var(--ink-2)] p-6 sm:p-8 space-y-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 h-7 w-7 shrink-0 text-[var(--cyan)]" aria-hidden="true" />
          <div>
            <ShotCaption parts={["REQUEST RECEIVED", "NO DEPOSIT PAID YET"]} />
            <h1 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">
              Request received
            </h1>
            <p className="mt-2 text-sm text-[var(--grey)]">
              Your booking reference is{" "}
              <span className="font-mono-meta text-base font-bold text-[var(--white)]">
                {reference}
              </span>
              . Keep this reference handy when speaking with our desk.
            </p>
          </div>
        </div>

        {summary ? (
          <div className="border border-[var(--hairline)] bg-[var(--black)] p-4 text-sm space-y-2">
            <div className="flex justify-between gap-4">
              <span className="text-[var(--grey)]">Client</span>
              <span className="font-medium text-[var(--white)]">{summary.clientName}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[var(--grey)]">Service</span>
              <span className="font-medium text-[var(--white)]">{summary.serviceName}</span>
            </div>
            {summary.packageName && (
              <div className="flex justify-between gap-4">
                <span className="text-[var(--grey)]">Package</span>
                <span className="font-medium text-[var(--white)]">{summary.packageName}</span>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="text-[var(--grey)]">Date / deadline</span>
              <span className="font-medium text-[var(--white)]">
                {formatDisplayDate(summary.dateLabel)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[var(--grey)]">Confirmation sent to</span>
              <span className="font-medium text-[var(--white)]">{summary.clientEmail}</span>
            </div>
          </div>
        ) : (
          checkedStorage && (
            <div className="border border-[var(--hairline)] bg-[var(--black)] p-4 text-sm text-[var(--grey)]">
              Check your email inbox for your private booking summary and status link. For privacy, full details are not shown on a reloaded confirmation URL.
            </div>
          )
        )}

        <div className="space-y-2 border-t border-[var(--hairline)] pt-5 text-sm">
          <h2 className="font-display text-base font-bold text-[var(--white)]">What happens next</h2>
          <ol className="list-decimal space-y-1.5 pl-5 text-[var(--grey)]">
            <li>Our team checks the brief and crew schedule within one working day.</li>
            <li>You receive an itemised quote in Ghana Cedis via email and your private status page.</li>
            <li>Accept the quote and send the deposit to lock the date on our calendar.</li>
          </ol>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          {summary?.statusUrl && (
            <ButtonLink href={summary.statusUrl} variant="primary">
              Open private status page
            </ButtonLink>
          )}
          <ButtonLink href={waUrl} variant="secondary" target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span>Message on WhatsApp</span>
          </ButtonLink>
          <Link
            href="/portfolio"
            className="inline-flex min-h-[48px] items-center px-3 text-sm text-[var(--cyan)] underline underline-offset-4"
          >
            Browse portfolio
          </Link>
        </div>
      </div>
    </div>
  );
}
