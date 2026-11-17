import type { Metadata } from "next";
import { ConfirmationPanel } from "@/components/booking/confirmation-panel";
import { getPublicSiteSettings } from "@/modules/catalog/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Booking Request Received",
  robots: { index: false, follow: false },
};

export default async function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const settings = await getPublicSiteSettings();

  return (
    <ConfirmationPanel
      reference={reference}
      whatsappE164={settings.whatsapp_e164}
      businessName={settings.business_name}
    />
  );
}
