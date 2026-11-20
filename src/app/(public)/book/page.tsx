import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { PageHeading } from "@/components/ui/page-heading";
import { addDaysIso, buildWhatsAppUrl, getAccraTodayIso } from "@/lib/dates";
import { getPublicUnavailableDates } from "@/modules/booking/service";
import { getPublicCatalogue, getPublicSiteSettings } from "@/modules/catalog/service";
import { getPublicPolicyVersions } from "@/modules/content-legal/service";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Request a booking",
  description:
    "Send a structured photography, videography, or graphic design request to Hephzibah Media. Check available dates and receive a quote within one working day.",
};

export default async function BookPage() {
  const today = getAccraTodayIso();
  const [{ occasions, services, packages }, settings, policyVersions] = await Promise.all([
    getPublicCatalogue(),
    getPublicSiteSettings(),
    getPublicPolicyVersions(),
  ]);

  const maxDays = Math.min(Math.max(settings.max_advance_days, 60), 790);
  const firstEnd = addDaysIso(today, Math.min(maxDays, 395));
  const secondPromise =
    maxDays > 395
      ? getPublicUnavailableDates(addDaysIso(today, 396), addDaysIso(today, maxDays)).catch(() => ({
          dates: [] as string[],
        }))
      : Promise.resolve({ dates: [] as string[] });

  const [firstWindow, secondWindow] = await Promise.all([
    getPublicUnavailableDates(today, firstEnd).catch(() => ({
      dates: [] as string[],
    })),
    secondPromise,
  ]);
  const unavailableDates = Array.from(new Set([...firstWindow.dates, ...secondWindow.dates]));

  const fallbackWa = buildWhatsAppUrl(
    settings.whatsapp_e164,
    `Hello ${settings.business_name}, I would like to request a booking.`
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <PageHeading
          title="Request a booking"
          ghostTitle="BOOKING"
          description="Complete the four short frames below. We check availability and send an itemised Ghana Cedi quote within one working day."
        />
      </header>

      <noscript>
        <div className="mb-8 border-2 border-[var(--cyan)] bg-[var(--ink-2)] p-6 text-sm">
          <p className="font-semibold text-[var(--white)]">
            JavaScript is turned off in your browser.
          </p>
          <p className="mt-2 text-[var(--grey)]">
            You can still send your booking request by messaging our studio on WhatsApp or emailing{" "}
            <a href={`mailto:${settings.contact_email}`} className="text-[var(--cyan)] underline">
              {settings.contact_email}
            </a>
            .
          </p>
          <p className="mt-3">
            <a
              href={fallbackWa}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--cyan)] underline underline-offset-4"
            >
              Message on WhatsApp
            </a>
          </p>
        </div>
      </noscript>

      <Suspense
        fallback={
          <div className="h-96 rounded-[2px] border border-[var(--hairline)] bg-[var(--ink-2)] p-6" role="status" aria-label="Loading booking form" />
        }
      >
        <BookingWizard
          services={services}
          occasions={occasions}
          packages={packages}
          settings={settings}
          policyVersions={policyVersions}
          initialUnavailableDates={unavailableDates}
        />
      </Suspense>
    </div>
  );
}
