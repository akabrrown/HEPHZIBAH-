import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { PageHeading } from "@/components/ui/page-heading";
import { addDaysIso, buildWhatsAppUrl, getAccraTodayIso } from "@/lib/dates";
import { getPublicUnavailableDates } from "@/modules/booking/service";
import { serviceKindValues, type ServiceKind } from "@/modules/catalog/schema";
import { getPublicCatalogue, getPublicSiteSettings } from "@/modules/catalog/service";
import { getPublicPolicyVersions } from "@/modules/content-legal/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Request a booking",
  description:
    "Send a structured photography, videography, or graphic design request to Hephzibah Media. Check available dates and receive a quote within one working day.",
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{
    kind?: string;
    service?: string;
    package?: string;
    occasion?: string;
    ref?: string;
  }>;
}) {
  const sp = await searchParams;
  const initialKind = serviceKindValues.includes(sp.kind as ServiceKind)
    ? (sp.kind as ServiceKind)
    : undefined;

  const today = getAccraTodayIso();
  const to = addDaysIso(today, 395);

  const [{ occasions, services, packages }, settings, policyVersions, availability] =
    await Promise.all([
      getPublicCatalogue(),
      getPublicSiteSettings(),
      getPublicPolicyVersions(),
      getPublicUnavailableDates(today, to).catch(() => ({
        dates: [] as string[],
        minLeadDays: 3,
        maxAdvanceDays: 540,
      })),
    ]);

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

      <BookingWizard
        services={services}
        occasions={occasions}
        packages={packages}
        settings={settings}
        policyVersions={policyVersions}
        initialUnavailableDates={availability.dates}
        initialKind={initialKind}
        initialServiceId={sp.service}
        initialPackageId={sp.package}
        initialOccasionId={sp.occasion}
        initialSource={sp.ref?.slice(0, 40)}
      />
    </div>
  );
}
