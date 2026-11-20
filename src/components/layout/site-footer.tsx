"use client";

import { MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildWhatsAppUrl } from "@/lib/dates";
import { BrandLogo } from "@/components/ui/brand-logo";
import { SocialLinks } from "@/components/ui/social-links";
import type { SiteSettings } from "@/modules/catalog/schema";

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const pathname = usePathname() || "/";
  const whatsappUrl = buildWhatsAppUrl(
    settings.whatsapp_e164,
    `Hello ${settings.business_name}, I am writing from ${pathname}.`
  );

  return (
    <footer className="border-t border-[var(--hairline)] bg-[var(--black)] text-[var(--grey)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="space-y-4 md:col-span-2">
            <Link href="/" className="inline-block focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)]">
              <BrandLogo variant="auto" size="lg" />
            </Link>
            <div className="font-mono text-xs text-[var(--cyan)] pt-1">
              <span className="font-bold tracking-widest uppercase">ACCRA STUDIO DESK · MON&ndash;SAT</span>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-[var(--grey)]">
              Photography, videography, and graphic design across Ghana. Straight pricing, honest availability, and responses within one working day.
            </p>
            {settings.address_text && (
              <p className="font-mono-meta text-xs uppercase tracking-wider text-[var(--grey)]">
                {settings.address_text}
              </p>
            )}
            <SocialLinks
              instagramUrl={settings.social?.instagram}
              tiktokUrl={settings.social?.tiktok}
            />
          </div>

          <div className="space-y-3">
            <p className="font-mono-meta text-xs uppercase tracking-widest text-[var(--white)]">
              Reach the desk
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-2 text-[var(--cyan)] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)]"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  WhatsApp studio desk
                </a>
              </li>
              {settings.phone_e164 && (
                <li>
                  <a
                    href={`tel:${settings.phone_e164}`}
                    className="inline-flex min-h-[44px] items-center gap-2 text-[var(--white)] hover:text-[var(--cyan)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)]"
                  >
                    <Phone className="h-4 w-4" aria-hidden="true" />
                    {settings.phone_e164}
                  </a>
                </li>
              )}
              <li>
                <a
                  href={`mailto:${settings.contact_email}`}
                  className="inline-flex min-h-[44px] items-center text-[var(--white)] hover:text-[var(--cyan)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)]"
                >
                  {settings.contact_email}
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="font-mono-meta text-xs uppercase tracking-widest text-[var(--white)]">
              Studio policies
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/terms" className="inline-flex min-h-[44px] items-center hover:text-[var(--cyan)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)]">
                  Terms and conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="inline-flex min-h-[44px] items-center hover:text-[var(--cyan)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)]">
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link href="/booking-policy" className="inline-flex min-h-[44px] items-center hover:text-[var(--cyan)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)]">
                  Booking, cancellation and refund policy
                </Link>
              </li>
              <li>
                <Link href="/testimonials" className="inline-flex min-h-[44px] items-center hover:text-[var(--cyan)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)]">
                  Client testimonials
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--hairline)] pt-6 text-xs">
          <p>
            &copy; {new Date().getFullYear()} {settings.business_name}. Commissioned work copyright governed by contract and Act 690.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="inline-flex min-h-[44px] items-center font-mono-meta text-[11px] text-[var(--grey)] hover:text-[var(--cyan)] transition-colors underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)]"
            >
              Studio Desk · Admin
            </Link>
            <span className="text-[var(--hairline)]">·</span>
            <p className="font-mono-meta uppercase tracking-wider">
              GMT / AFRICA-ACCRA
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
