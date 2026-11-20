import { resolveAdminPageSession } from "@/components/admin/page-guard";
import { ScopeDenied } from "@/components/admin/scope-denied";
import { TeamClient } from "@/components/admin/team-client";
import { listTeamAdmins } from "@/modules/admin/service";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const admin = await resolveAdminPageSession("team");
  if (!admin) {
    return <ScopeDenied requiredScope="team" />;
  }

  const members = await listTeamAdmins(admin);
  return <TeamClient initialMembers={members} currentAdminId={admin.adminId} />;
}
