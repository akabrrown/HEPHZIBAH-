import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminDeskLayout({ children }: { children: React.ReactNode }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/admin/sign-in");
  }

  return (
    <AdminShell displayName={admin.displayName} scopes={admin.scopes}>
      {children}
    </AdminShell>
  );
}
