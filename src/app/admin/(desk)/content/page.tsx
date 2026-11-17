import { ContentManagerClient } from "@/components/admin/content-manager-client";
import { ScopeDenied } from "@/components/admin/scope-denied";
import { requireAdmin } from "@/lib/auth";
import { listAdminServicesAndPackages } from "@/modules/catalog/service";
import { listAdminContent } from "@/modules/portfolio/service";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  let admin;
  try {
    admin = await requireAdmin("content");
  } catch {
    return <ScopeDenied requiredScope="content" />;
  }

  const [catalog, content] = await Promise.all([
    listAdminServicesAndPackages(admin),
    listAdminContent(admin),
  ]);

  return (
    <ContentManagerClient
      initialServices={catalog.services}
      initialPackages={catalog.packages}
      initialTestimonials={content.testimonials}
      initialFaqs={content.faqs}
    />
  );
}
