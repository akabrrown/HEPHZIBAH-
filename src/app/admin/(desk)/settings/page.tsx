import { ScopeDenied } from "@/components/admin/scope-denied";
import { SettingsClient } from "@/components/admin/settings-client";
import { requireAdmin } from "@/lib/auth";
import { getPublicSiteSettings } from "@/modules/catalog/service";
import { listAdminLegalDocuments } from "@/modules/content-legal/service";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  let admin;
  try {
    admin = await requireAdmin("settings");
  } catch {
    return <ScopeDenied requiredScope="settings" />;
  }

  const [settings, legalDocs] = await Promise.all([
    getPublicSiteSettings(),
    listAdminLegalDocuments(admin),
  ]);

  return <SettingsClient initialSettings={settings} initialLegalDocs={legalDocs} />;
}
