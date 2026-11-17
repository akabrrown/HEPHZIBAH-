import { PortfolioListClient } from "@/components/admin/portfolio-manager-client";
import { ScopeDenied } from "@/components/admin/scope-denied";
import { requireAdmin } from "@/lib/auth";
import { getPublicCatalogue } from "@/modules/catalog/service";
import { listAdminPortfolio } from "@/modules/portfolio/service";

export const dynamic = "force-dynamic";

export default async function AdminPortfolioPage() {
  let admin;
  try {
    admin = await requireAdmin("content");
  } catch {
    return <ScopeDenied requiredScope="content" />;
  }

  const [items, catalogue] = await Promise.all([
    listAdminPortfolio(admin),
    getPublicCatalogue(),
  ]);

  return <PortfolioListClient initialItems={items} occasions={catalogue.occasions} />;
}
