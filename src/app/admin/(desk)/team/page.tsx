import { ScopeDenied } from "@/components/admin/scope-denied";
import { TeamClient } from "@/components/admin/team-client";
import { requireAdmin } from "@/lib/auth";
import { listTeamAdmins } from "@/modules/admin/service";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  let admin;
  try {
    admin = await requireAdmin("team");
  } catch {
    return <ScopeDenied requiredScope="team" />;
  }

  const members = await listTeamAdmins(admin);
  return <TeamClient initialMembers={members} currentAdminId={admin.adminId} />;
}
