import { BookingsListClient } from "@/components/admin/bookings-list-client";
import { resolveAdminPageSession } from "@/components/admin/page-guard";
import { ScopeDenied } from "@/components/admin/scope-denied";
import { bookingStatusValues, type BookingStatus } from "@/modules/booking/schema";
import { listBookingsForAdmin } from "@/modules/booking/service";
import { serviceKindValues, type ServiceKind } from "@/modules/catalog/schema";

export const dynamic = "force-dynamic";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseSafeIsoDate(value?: string): string | undefined {
  if (!value || !ISO_DATE_RE.test(value)) return undefined;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value ? value : undefined;
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; kind?: string; q?: string; from?: string; to?: string }>;
}) {
  const admin = await resolveAdminPageSession("bookings");
  if (!admin) {
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
  const from = parseSafeIsoDate(sp.from);
  const to = parseSafeIsoDate(sp.to);

  const { items, nextCursor } = await listBookingsForAdmin(admin, {
    status,
    kind,
    q: sp.q,
    from,
    to,
    limit: 60,
  });

  return (
    <BookingsListClient
      items={items}
      initialNextCursor={nextCursor}
      initialFilters={{
        status: status ?? "",
        kind: kind ?? "",
        q: sp.q ?? "",
        from: from ?? "",
        to: to ?? "",
      }}
    />
  );
}
