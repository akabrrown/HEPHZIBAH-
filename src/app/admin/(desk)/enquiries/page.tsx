import { EnquiriesClient } from "@/components/admin/enquiries-client";
import { resolveAdminPageSession } from "@/components/admin/page-guard";
import { ScopeDenied } from "@/components/admin/scope-denied";
import { listAdminEnquiries } from "@/modules/content-legal/service";

export const dynamic = "force-dynamic";

export default async function AdminEnquiriesPage() {
  const admin = await resolveAdminPageSession("bookings");
  if (!admin) {
    return <ScopeDenied requiredScope="bookings" />;
  }

  const items = await listAdminEnquiries(admin);
  return <EnquiriesClient initialItems={items} />;
}
