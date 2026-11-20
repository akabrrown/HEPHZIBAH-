import { resolveAdminPageSession } from "@/components/admin/page-guard";
import { PortfolioListClient } from "@/components/admin/portfolio-manager-client";
import { ScopeDenied } from "@/components/admin/scope-denied";
import { getPublicCatalogue } from "@/modules/catalog/service";
import { listAdminPortfolio } from "@/modules/portfolio/service";

export const dynamic = "force-dynamic";

export default async function AdminPortfolioPage() {
  const admin = await resolveAdminPageSession("content");
  if (!admin) {
    return <ScopeDenied requiredScope="content" />;
  }

  const [items, catalogue] = await Promise.all([
    listAdminPortfolio(admin),
    getPublicCatalogue(),
  ]);

  return <PortfolioListClient initialItems={items} occasions={catalogue.occasions} />;
}
