import { notFound } from "next/navigation";
import { BookingDetailClient } from "@/components/admin/booking-detail-client";
import { ScopeDenied } from "@/components/admin/scope-denied";
import { requireAdmin } from "@/lib/auth";
import { getBookingDetailForAdmin } from "@/modules/booking/service";
import { getPublicCatalogue, getPublicSiteSettings } from "@/modules/catalog/service";

export const dynamic = "force-dynamic";

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let admin;
  try {
    admin = await requireAdmin("bookings");
  } catch {
    return <ScopeDenied requiredScope="bookings" />;
  }

  const { id } = await params;

  let detail;
  try {
    detail = await getBookingDetailForAdmin(admin, id);
  } catch {
    notFound();
  }

  const [catalogue, settings] = await Promise.all([
    getPublicCatalogue(detail.booking.kind),
    getPublicSiteSettings(),
  ]);

  const servicePackages = catalogue.packages.filter(
    (p) => p.service_id === detail.booking.service_id
  );

  return (
    <BookingDetailClient
      booking={detail.booking}
      events={detail.events}
      quotes={detail.quotes}
      payments={detail.payments}
      servicePackages={servicePackages}
      whatsappE164={settings.whatsapp_e164}
      defaultValidDays={settings.quote_validity_days}
    />
  );
}
