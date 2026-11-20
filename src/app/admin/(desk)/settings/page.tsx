import { resolveAdminPageSession } from "@/components/admin/page-guard";
import { ScopeDenied } from "@/components/admin/scope-denied";
import { SettingsClient } from "@/components/admin/settings-client";
import { getAdminSiteSettings } from "@/modules/catalog/service";
import { listAdminLegalDocuments } from "@/modules/content-legal/service";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admin = await resolveAdminPageSession("settings");
  if (!admin) {
    return <ScopeDenied requiredScope="settings" />;
  }

  const [settings, legalDocs] = await Promise.all([
    getAdminSiteSettings(admin),
    listAdminLegalDocuments(admin),
  ]);

  return <SettingsClient initialSettings={settings} initialLegalDocs={legalDocs} />;
}
