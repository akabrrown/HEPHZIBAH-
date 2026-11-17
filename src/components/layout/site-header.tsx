"use client";

import { MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { buildWhatsAppUrl } from "@/lib/dates";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ButtonLink } from "@/components/ui/button";
import { SocialLinks } from "@/components/ui/social-links";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

function isNavItemActive(pathname: string, href: string): boolean {
  const pathOnly = pathname.split("?")[0] || "/";
  return href === "/"
    ? pathOnly === "/"
    : pathOnly === href || pathOnly.startsWith(`${href}/`);
}

export function SiteHeader({
  businessName,
  whatsappE164,
}: {
  businessName: string;
  whatsappE164: string;
}) {
  const pathname = usePathname() || "/";
  const [menuOpen, setMenuOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll and handle Escape key when mobile side nav is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setMenuOpen(false);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [menuOpen]);

  const whatsappUrl = buildWhatsAppUrl(
    whatsappE164,
    `Hello ${businessName}, I am visiting ${pathname} and would like to ask about a booking.`
  );

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--hairline)] bg-[var(--black)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          aria-label={businessName}
          className="inline-flex min-h-[44px] items-center text-[var(--white)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)]"
        >
          <BrandLogo variant="auto" size="md" priority />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((item) => {
            const active = isNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`min-h-[44px] inline-flex items-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] ${
                  active
                    ? "text-[var(--cyan)] underline decoration-2 underline-offset-4"
                    : "text-[var(--white)] hover:text-[var(--cyan)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden min-h-[44px] items-center gap-1.5 rounded-[2px] border-2 border-[var(--cyan)]/40 px-3.5 text-sm font-medium text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)] hover:shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all sm:inline-flex"
          >
            <MessageCircle className="h-4 w-4 text-[var(--cyan)]" aria-hidden="true" />
            <span>WhatsApp</span>
          </a>

          {pathname !== "/book" && (
            <ButtonLink
              href="/book"
              variant={pathname === "/" || pathname === "/contact" ? "secondary" : "cyan"}
              className="px-3 py-1.5 text-xs sm:px-5 sm:py-2.5 sm:text-sm shadow-[0_0_15px_rgba(0,229,255,0.2)]"
              aria-label="Request a booking"
            >
              <span className="sm:hidden">Book</span>
              <span className="hidden sm:inline">Request a booking</span>
            </ButtonLink>
          )}

          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-side-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((prev) => !prev)}
            className="rh-lines-button"
          >
            <span className="rh-lines-bar" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Activated Mobile Side Navigation Drawer (Rapperholic Angled Electric Cyan Architecture) */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" id="mobile-side-nav">
          {/* Backdrop Scrim with dark blur */}
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Rapperholic Angled Electric Cyan Drawer */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Studio Navigation"
            className="rh-menu-drawer rh-drawer-animated"
          >
            {/* Drawer Top Bar: Brand Logo, Studio Tag & High-Contrast Close Button */}
            <div className="flex items-center justify-between border-b-2 border-black/15 bg-black/10 px-5 py-4 pl-8">
              <Link href="/" onClick={() => setMenuOpen(false)} aria-label={businessName}>
                <BrandLogo variant="light" size="sm" priority />
              </Link>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block rounded bg-black/15 px-2 py-0.5 font-mono text-[10px] font-black tracking-widest text-black">
                  STUDIO NAV
                </span>
                <button
                  type="button"
                  aria-label="Close navigation menu"
                  onClick={() => setMenuOpen(false)}
                  className="group flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-black text-[#00E5FF] shadow-lg transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black cursor-pointer"
                >
                  <X className="h-5 w-5 stroke-[2.5] text-[#00E5FF] transition-transform duration-200 group-hover:rotate-90" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Navigation Links Column with North Arena Typography */}
            <nav className="flex-1 overflow-y-auto px-6 py-5 pl-8" aria-label="Mobile Navigation Drawer">
              <ul className="space-y-1.5">
                {NAV_LINKS.map((item, idx) => {
                  const active = isNavItemActive(pathname, item.href);
                  const num = String(idx + 1).padStart(2, "0");
                  return (
                    <li
                      key={item.href}
                      className="rh-link-stagger"
                      style={{ animationDelay: `${idx * 35}ms` }}
                    >
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setMenuOpen(false)}
                        className={`group flex items-center justify-between border-b border-black/15 py-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                          active ? "opacity-100" : "opacity-85 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-baseline gap-3">
                          <span className="font-mono text-xs font-black tracking-widest text-black/60 group-hover:text-black">
                            {num}
                          </span>
                          <span className="font-north-arena text-3xl uppercase tracking-wider text-black transition-transform group-hover:translate-x-1.5">
                            {item.label}
                          </span>
                        </div>
                        {active ? (
                          <span className="rounded bg-black px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-widest text-[#00E5FF] shadow-sm">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="font-mono text-xs font-bold text-black/30 transition-transform group-hover:translate-x-1 group-hover:text-black">
                            &rarr;
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}

                <li
                  className="rh-link-stagger pt-4"
                  style={{ animationDelay: `${NAV_LINKS.length * 35}ms` }}
                >
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between rounded-[2px] border-2 border-black/30 bg-black/10 px-3.5 py-2.5 font-mono text-xs font-black uppercase tracking-wider text-black transition-all hover:border-black hover:bg-black/20"
                  >
                    <span className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                      <span>WhatsApp Studio Desk</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-black/80">
                      <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                      ONLINE
                    </span>
                  </a>
                </li>

                <li
                  className="rh-link-stagger pt-2"
                  style={{ animationDelay: `${(NAV_LINKS.length + 1) * 35}ms` }}
                >
                  <div className="flex items-center justify-between rounded-[2px] border-2 border-black/30 bg-black/10 px-3.5 py-2">
                    <span className="font-mono text-xs font-black uppercase tracking-wider text-black">
                      THEME
                    </span>
                    <ThemeToggle showLabel className="border-black/40 bg-black text-[#00E5FF] hover:bg-black/90 hover:text-white" />
                  </div>
                </li>
              </ul>
            </nav>

            {/* Bottom Dock: Action CTA & Socials */}
            <div className="border-t-2 border-black/15 bg-black/10 p-5 pl-8 space-y-3.5">
              {pathname !== "/book" && (
                <Link
                  href="/book"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex min-h-[50px] w-full items-center justify-center rounded-[2px] border-2 border-black bg-black px-6 py-3.5 font-north-arena text-base uppercase tracking-wider !text-[#00E5FF] shadow-xl hover:bg-neutral-900 hover:!text-white transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                >
                  Request a booking
                </Link>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="font-mono text-xs font-black tracking-widest text-black">
                  CONNECT
                </span>
                <SocialLinks />
              </div>

              <div className="text-center font-mono text-[10px] font-bold tracking-widest text-black/80 uppercase pt-1">
                ACCRA · GHANA · HEPHZIBAH MEDIA
              </div>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}
