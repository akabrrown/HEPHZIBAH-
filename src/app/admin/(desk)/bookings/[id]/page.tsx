import { notFound } from "next/navigation";
import { BookingDetailClient } from "@/components/admin/booking-detail-client";
import { resolveAdminPageSession } from "@/components/admin/page-guard";
import { ScopeDenied } from "@/components/admin/scope-denied";
import { ProblemError } from "@/lib/errors";
import { isUuid } from "@/lib/http";
import { getBookingDetailForAdmin } from "@/modules/booking/service";
import { getPublicCatalogue, getPublicSiteSettings } from "@/modules/catalog/service";

export const dynamic = "force-dynamic";

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await resolveAdminPageSession("bookings");
  if (!admin) {
    return <ScopeDenied requiredScope="bookings" />;
  }

  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }

  let detail;
  try {
    detail = await getBookingDetailForAdmin(admin, id);
  } catch (err) {
    if (err instanceof ProblemError && err.status === 404) {
      notFound();
    }
    throw err;
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
