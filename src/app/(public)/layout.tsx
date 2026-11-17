import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { WelcomeSplash } from "@/components/layout/welcome-splash";
import { getPublicSiteSettings } from "@/modules/catalog/service";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getPublicSiteSettings();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: settings.business_name,
    url: siteUrl,
    email: settings.contact_email,
    telephone: settings.phone_e164 ?? settings.whatsapp_e164,
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.address_text ?? "Accra",
      addressCountry: "GH",
    },
    areaServed: "Ghana",
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--black)] text-[var(--white)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <WelcomeSplash businessName={settings.business_name} />
      <SiteHeader businessName={settings.business_name} whatsappE164={settings.whatsapp_e164} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter settings={settings} />
    </div>
  );
}
