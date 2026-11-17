import { BookingsListClient } from "@/components/admin/bookings-list-client";
import { ScopeDenied } from "@/components/admin/scope-denied";
import { requireAdmin } from "@/lib/auth";
import { bookingStatusValues, type BookingStatus } from "@/modules/booking/schema";
import { listBookingsForAdmin } from "@/modules/booking/service";
import { serviceKindValues, type ServiceKind } from "@/modules/catalog/schema";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; kind?: string; q?: string; from?: string; to?: string }>;
}) {
  let admin;
  try {
    admin = await requireAdmin("bookings");
  } catch {
    return <ScopeDenied requiredScope="bookings" />;
  }

  const sp = await searchParams;
  const status =
    sp.status && bookingStatusValues.includes(sp.status as BookingStatus)
      ? (sp.status as BookingStatus)
      : undefined;
  const kind =
    sp.kind && serviceKindValues.includes(sp.kind as ServiceKind)
      ? (sp.kind as ServiceKind)
      : undefined;

  const { items } = await listBookingsForAdmin(admin, {
    status,
    kind,
    q: sp.q,
    from: sp.from,
    to: sp.to,
    limit: 60,
  });

  return (
    <BookingsListClient
      items={items}
      initialFilters={{
        status: status ?? "",
        kind: kind ?? "",
        q: sp.q ?? "",
        from: sp.from ?? "",
        to: sp.to ?? "",
      }}
    />
  );
}
