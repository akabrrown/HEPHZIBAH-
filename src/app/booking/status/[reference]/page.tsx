import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { ClientBookingStatusClient } from "@/components/booking/status-client";
import { ButtonLink } from "@/components/ui/button";
import { ShotCaption } from "@/components/ui/viewfinder";
import { buildWhatsAppUrl } from "@/lib/dates";
import { getClientBookingStatus } from "@/modules/booking/service";
import { getPublicSiteSettings } from "@/modules/catalog/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Booking status",
  robots: { index: false, follow: false },
};

export default async function ClientBookingStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { reference } = await params;
  const sp = await searchParams;
  const token = sp.t?.trim() ?? "";

  const statusView = token ? await getClientBookingStatus(reference, token) : null;

  if (!statusView) {
    const settings = await getPublicSiteSettings();
    const waUrl = buildWhatsAppUrl(
      settings.whatsapp_e164,
      `Hello ${settings.business_name}, I need a fresh status link for booking ${reference}.`
    );
    return (
      <div className="min-h-screen bg-[var(--black)] text-[var(--white)] flex items-center justify-center px-4">
        <div className="max-w-md w-full border border-[var(--hairline)] bg-[var(--ink-2)] p-7 space-y-4">
          <ShotCaption parts={["BOOKING STATUS", "LINK INVALID OR EXPIRED"]} />
          <h1 className="font-display text-2xl font-bold">
            This status link is not valid
          </h1>
          <p className="text-sm leading-relaxed text-[var(--grey)]">
            For client privacy, booking details open only with a valid private link from your email. If your link expired or was lost, message our studio on WhatsApp with your reference and we will send a fresh link.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <ButtonLink href={waUrl} variant="secondary" target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              <span>Request a fresh link on WhatsApp</span>
            </ButtonLink>
            <ButtonLink href="/" variant="ghost">
              Return home
            </ButtonLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--black)] text-[var(--white)]">
      <ClientBookingStatusClient initialData={statusView} token={token} />
    </div>
  );
}
