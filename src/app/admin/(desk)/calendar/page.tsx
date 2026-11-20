import { AdminCalendarClient } from "@/components/admin/calendar-client";
import { resolveAdminPageSession } from "@/components/admin/page-guard";
import { ScopeDenied } from "@/components/admin/scope-denied";
import { addDaysIso, getAccraTodayIso } from "@/lib/dates";
import { getCalendarAndBlockedDatesAdmin } from "@/modules/booking/service";

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage() {
  const admin = await resolveAdminPageSession("bookings");
  if (!admin) {
    return <ScopeDenied requiredScope="bookings" />;
  }

  const today = getAccraTodayIso();
  const data = await getCalendarAndBlockedDatesAdmin(admin, today, addDaysIso(today, 90));

  return <AdminCalendarClient bookings={data.bookings} blockedDates={data.blocked} />;
}
