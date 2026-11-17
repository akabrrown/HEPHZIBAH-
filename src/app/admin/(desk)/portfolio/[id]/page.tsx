import { notFound } from "next/navigation";
import { PortfolioDetailClient } from "@/components/admin/portfolio-manager-client";
import { ScopeDenied } from "@/components/admin/scope-denied";
import { requireAdmin } from "@/lib/auth";
import { ProblemError } from "@/lib/errors";
import { getPublicCatalogue } from "@/modules/catalog/service";
import { getAdminPortfolioDetail } from "@/modules/portfolio/service";

export const dynamic = "force-dynamic";

export default async function AdminPortfolioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let admin;
  try {
    admin = await requireAdmin("content");
  } catch {
    return <ScopeDenied requiredScope="content" />;
  }

  const { id } = await params;

  try {
    const [item, catalogue] = await Promise.all([
      getAdminPortfolioDetail(admin, id),
      getPublicCatalogue(),
    ]);
    return <PortfolioDetailClient initialItem={item} occasions={catalogue.occasions} />;
  } catch (err) {
    if (err instanceof ProblemError && err.status === 404) {
      notFound();
    }
    throw err;
  }
}
