import type { MetadataRoute } from "next";
import { getPublicPortfolioList } from "@/modules/portfolio/service";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const portfolio = await getPublicPortfolioList().catch(() => []);

  const staticRoutes = [
    "",
    "/services",
    "/services/photography",
    "/services/videography",
    "/services/design",
    "/portfolio",
    "/pricing",
    "/book",
    "/about",
    "/testimonials",
    "/faq",
    "/contact",
    "/terms",
    "/privacy",
    "/booking-policy",
  ];

  const entries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" || route === "/portfolio" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.8,
  }));

  for (const item of portfolio) {
    entries.push({
      url: `${siteUrl}/portfolio/${item.slug}`,
      lastModified: new Date(item.updated_at),
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  return entries;
}
