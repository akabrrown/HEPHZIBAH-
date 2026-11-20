import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { ClientBookingStatusClient } from "@/components/booking/status-client";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ButtonLink } from "@/components/ui/button";
import { ShotCaption } from "@/components/ui/viewfinder";
import { buildWhatsAppUrl } from "@/lib/dates";
import { checkSlidingWindowLimit, getClientSourceKey } from "@/lib/rate-limit";
import { getClientBookingStatus } from "@/modules/booking/service";
import { getPublicSiteSettings } from "@/modules/catalog/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Booking status",
  robots: { index: false, follow: false },
};

export default async function ClientBookingStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { reference } = await params;
  const sp = await searchParams;
  const token = sp.t?.trim() ?? "";

  const reqHeaders = await headers();
  const source = getClientSourceKey(reqHeaders);
  const ipLimit = checkSlidingWindowLimit(`status-page-ip:${source}`, 40, 10 * 60_000);
  const refLimit = checkSlidingWindowLimit(`status-page:${reference}:${source}`, 20, 10 * 60_000);
  const rateLimited = !ipLimit.allowed || !refLimit.allowed;

  const [statusView, settings] = await Promise.all([
    !rateLimited && token ? getClientBookingStatus(reference, token) : Promise.resolve(null),
    getPublicSiteSettings(),
  ]);

  const topBar = (
    <header className="border-b border-[var(--hairline)] bg-[var(--ink-2)]">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-3 text-[var(--white)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)]"
        >
          <BrandLogo variant="auto" size="sm" />
          <span className="hidden font-mono-meta text-xs text-[var(--grey)] sm:inline">
            Return to studio site
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center rounded-[2px] border border-[var(--control-border)] px-3 text-xs font-medium text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)] sm:hidden"
          >
            Studio site
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );

  if (rateLimited) {
    return (
      <div className="min-h-screen bg-[var(--black)] text-[var(--white)] flex flex-col">
        {topBar}
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="max-w-md w-full border border-[var(--hairline)] bg-[var(--ink-2)] p-7 space-y-4">
            <ShotCaption parts={["BOOKING STATUS", "TOO MANY ATTEMPTS"]} />
            <h1 className="font-display text-2xl font-bold">Please wait a few minutes</h1>
            <p className="text-sm leading-relaxed text-[var(--grey)]">
              Too many status link checks were made from this connection. Wait a few minutes and reload your link.
            </p>
            <ButtonLink href="/" variant="secondary">
              Return home
            </ButtonLink>
          </div>
        </div>
      </div>
    );
  }

  if (!statusView) {
    const waUrl = buildWhatsAppUrl(
      settings.whatsapp_e164,
      `Hello ${settings.business_name}, I need a fresh status link for booking ${reference}.`
    );
    return (
      <div className="min-h-screen bg-[var(--black)] text-[var(--white)] flex flex-col">
        {topBar}
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="max-w-md w-full border border-[var(--hairline)] bg-[var(--ink-2)] p-7 space-y-4">
            <ShotCaption parts={["BOOKING STATUS", "LINK INVALID OR EXPIRED"]} />
            <h1 className="font-display text-2xl font-bold">
              This status link is not valid
            </h1>
            <p className="text-sm leading-relaxed text-[var(--grey)]">
              For client privacy, booking details open only with a valid private link from your email. If your link expired or was lost, message our studio on WhatsApp with your reference and we will send a fresh link.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <ButtonLink href={waUrl} variant="secondary" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <span>Request a fresh link on WhatsApp</span>
              </ButtonLink>
              <ButtonLink href="/" variant="ghost">
                Return home
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--black)] text-[var(--white)] flex flex-col">
      {topBar}
      <div className="flex-1">
        <ClientBookingStatusClient initialData={statusView} token={token} />
      </div>
    </div>
  );
}
