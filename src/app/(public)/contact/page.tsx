import type { Metadata } from "next";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { ContactEnquiryForm } from "@/components/contact/contact-form";
import { ButtonLink } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { SocialLinks } from "@/components/ui/social-links";
import { buildWhatsAppUrl } from "@/lib/dates";
import { getPublicSiteSettings } from "@/modules/catalog/service";
import { getPublicPolicyVersions } from "@/modules/content-legal/service";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Contact",
  description: "Reach Hephzibah Media via WhatsApp, phone, email, or the studio enquiry form.",
};

export default async function ContactPage() {
  const [settings, policyVersions] = await Promise.all([
    getPublicSiteSettings(),
    getPublicPolicyVersions(),
  ]);

  const waUrl = buildWhatsAppUrl(
    settings.whatsapp_e164,
    `Hello ${settings.business_name}, I have a question from your contact page.`
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <PageHeading
          title="Contact"
          ghostTitle="CONTACT"
          description={`Reach our studio desk for urgent dates within ${settings.min_lead_days} days or written briefs. WhatsApp is fastest for short-notice events.`}
        />
        <h2 className="mt-4 font-display text-xl font-bold text-[var(--white)]">
          Reach our studio desk
        </h2>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5 space-y-4">
          <div className="border border-[var(--cyan)] bg-[var(--ink-2)] p-6 space-y-3">
            <p className="font-mono-meta text-xs uppercase text-[var(--cyan)]">FASTEST CHANNEL</p>
            <h2 className="font-display text-xl font-bold">WhatsApp studio desk</h2>
            <p className="text-sm text-[var(--grey)]">
              Direct line to the team between shoots. Ideal for short-notice events and reference sharing.
            </p>
            <ButtonLink
              href={waUrl}
              variant="cyan"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full justify-center"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              <span>Chat on WhatsApp</span>
            </ButtonLink>
          </div>

          <div className="border border-[var(--hairline)] bg-[var(--ink-2)] p-6 space-y-4 text-sm hm-card-interactive">
            {settings.phone_e164 && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-[var(--cyan)]" aria-hidden="true" />
                <a href={`tel:${settings.phone_e164}`} className="hover:text-[var(--cyan)]">
                  {settings.phone_e164}
                </a>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-[var(--cyan)]" aria-hidden="true" />
              <a href={`mailto:${settings.contact_email}`} className="hover:text-[var(--cyan)]">
                {settings.contact_email}
              </a>
            </div>
            {settings.address_text && (
              <p className="font-mono-meta text-xs uppercase text-[var(--grey)] pt-2 border-t border-[var(--hairline)]">
                {settings.address_text}
              </p>
            )}
            <div className="border-t border-[var(--hairline)] pt-4 space-y-2">
              <p className="font-mono-meta text-xs uppercase tracking-wider text-[var(--grey)]">
                Follow studio work
              </p>
              <SocialLinks
                instagramUrl={settings.social?.instagram}
                tiktokUrl={settings.social?.tiktok}
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <ContactEnquiryForm privacyVersion={policyVersions.privacyVersion} />
        </div>
      </div>
    </div>
  );
}
