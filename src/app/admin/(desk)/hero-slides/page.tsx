import { HeroSlidesClient } from "@/components/admin/hero-slides-client";
import { resolveAdminPageSession } from "@/components/admin/page-guard";
import { ScopeDenied } from "@/components/admin/scope-denied";
import { listAdminHeroSlides } from "@/modules/hero-slides/service";

export const dynamic = "force-dynamic";

export default async function AdminHeroSlidesPage() {
  const admin = await resolveAdminPageSession("content");
  if (!admin) {
    return <ScopeDenied requiredScope="content" />;
  }

  const slides = await listAdminHeroSlides(admin);

  return <HeroSlidesClient initialSlides={slides} />;
}
