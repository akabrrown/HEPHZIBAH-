import { EnquiriesClient } from "@/components/admin/enquiries-client";
import { ScopeDenied } from "@/components/admin/scope-denied";
import { requireAdmin } from "@/lib/auth";
import { listAdminEnquiries } from "@/modules/content-legal/service";

export const dynamic = "force-dynamic";

export default async function AdminEnquiriesPage() {
  let admin;
  try {
    admin = await requireAdmin("bookings");
  } catch {
    return <ScopeDenied requiredScope="bookings" />;
  }

  const items = await listAdminEnquiries(admin);
  return <EnquiriesClient initialItems={items} />;
}
