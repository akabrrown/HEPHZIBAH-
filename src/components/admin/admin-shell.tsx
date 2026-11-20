"use client";

import { LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BrandLogo } from "@/components/ui/brand-logo";
import type { AdminScope } from "@/lib/auth";

interface NavItem {
  href: string;
  label: string;
  scope?: AdminScope;
}

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/bookings", label: "Bookings", scope: "bookings" },
  { href: "/admin/calendar", label: "Calendar", scope: "bookings" },
  { href: "/admin/portfolio", label: "Portfolio", scope: "content" },
  { href: "/admin/hero-slides", label: "Hero Slides", scope: "content" },
  { href: "/admin/content", label: "Content", scope: "content" },
  { href: "/admin/enquiries", label: "Enquiries", scope: "bookings" },
  { href: "/admin/settings", label: "Settings", scope: "settings" },
  { href: "/admin/team", label: "Team", scope: "team" },
];

export function AdminShell({
  displayName,
  scopes,
  children,
}: {
  displayName: string;
  scopes: AdminScope[];
  children: ReactNode;
}) {
  const pathname = usePathname() || "/admin";
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const visibleNav = ADMIN_NAV.filter((item) => !item.scope || scopes.includes(item.scope));

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/admin/auth/sign-out", { method: "POST" });
      router.push("/admin/sign-in");
      router.refresh();
    } catch {
      router.push("/admin/sign-in");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--black)] text-[var(--white)] flex flex-col">
      <header className="sticky top-0 z-40 border-b border-[var(--hairline)] bg-[var(--ink-2)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="inline-flex min-h-[44px] items-center gap-2.5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)]"
            >
              <BrandLogo variant="auto" size="sm" />
              <span className="font-display text-sm font-extrabold uppercase tracking-wider text-[var(--white)] hidden sm:inline">
                Desk
              </span>
            </Link>
            <span className="hidden font-mono-meta text-xs text-[var(--grey)] md:inline">
              · {displayName}
            </span>
          </div>

          <nav aria-label="Admin sections" className="hidden items-center gap-4 lg:flex">
            {visibleNav.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-[44px] items-center px-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] ${
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

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/"
              target="_blank"
              className="hidden min-h-[44px] items-center border border-[var(--control-border)] px-3 text-xs font-medium text-[var(--grey)] hover:border-[var(--cyan)] hover:text-[var(--cyan)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] sm:inline-flex"
            >
              Public site
            </Link>
            <button
              type="button"
              aria-label="Sign out"
              disabled={signingOut}
              onClick={handleSignOut}
              className="inline-flex min-h-[44px] items-center gap-1.5 border border-[var(--control-border)] px-3 text-xs font-medium text-[var(--white)] hover:border-[var(--red)] hover:text-[var(--red)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{signingOut ? "Signing out..." : "Sign out"}</span>
            </button>
            <button
              type="button"
              aria-expanded={navOpen}
              aria-label="Toggle admin menu"
              onClick={() => setNavOpen((v) => !v)}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center border border-[var(--control-border)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] lg:hidden cursor-pointer"
            >
              {navOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {navOpen && (
          <nav aria-label="Mobile admin sections" className="border-t border-[var(--hairline)] px-4 py-3 lg:hidden">
            <ul className="grid grid-cols-2 gap-1">
              {visibleNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setNavOpen(false)}
                    className="flex min-h-[44px] items-center px-2 text-sm font-medium text-[var(--white)] hover:text-[var(--cyan)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
