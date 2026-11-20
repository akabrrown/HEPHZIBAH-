import { ContentManagerClient } from "@/components/admin/content-manager-client";
import { resolveAdminPageSession } from "@/components/admin/page-guard";
import { ScopeDenied } from "@/components/admin/scope-denied";
import { listAdminServicesAndPackages } from "@/modules/catalog/service";
import { listAdminContent } from "@/modules/portfolio/service";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const admin = await resolveAdminPageSession("content");
  if (!admin) {
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
