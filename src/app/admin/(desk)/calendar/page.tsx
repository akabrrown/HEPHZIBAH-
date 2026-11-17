import { AdminCalendarClient } from "@/components/admin/calendar-client";
import { ScopeDenied } from "@/components/admin/scope-denied";
import { requireAdmin } from "@/lib/auth";
import { addDaysIso, getAccraTodayIso } from "@/lib/dates";
import { getCalendarAndBlockedDatesAdmin } from "@/modules/booking/service";

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage() {
  let admin;
  try {
    admin = await requireAdmin("bookings");
  } catch {
    return <ScopeDenied requiredScope="bookings" />;
  }

  const today = getAccraTodayIso();
  const data = await getCalendarAndBlockedDatesAdmin(admin, today, addDaysIso(today, 90));

  return <AdminCalendarClient bookings={data.bookings} blockedDates={data.blocked} />;
}
