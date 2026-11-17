"use client";

import { AlertCircle, Check, CheckCircle2, Copy, Download, ExternalLink, KeyRound, MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { FormField, TEXTAREA_CLASSES } from "@/components/ui/form-field";
import { ShotCaption } from "@/components/ui/viewfinder";
import {
  buildWhatsAppUrl,
  formatAccraDateTime,
  formatDisplayDate,
} from "@/lib/dates";
import { formatGhsFromMinor } from "@/lib/money";
import type { ClientBookingStatusView } from "@/modules/booking/service";

export function ClientBookingStatusClient({
  initialData,
  token,
}: {
  initialData: ClientBookingStatusView;
  token: string;
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [accepting, setAccepting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  function handleCopy(text: string, type: "link" | "pin") {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      if (type === "link") {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } else {
        setCopiedPin(true);
        setTimeout(() => setCopiedPin(false), 2500);
      }
    }
  }

  const { booking, events, activeQuote, payments, settings } = data;

  const waUrl = buildWhatsAppUrl(
    settings.whatsapp_e164,
    `Hello ${settings.business_name}, I am writing about booking ${booking.reference}.`
  );

  const isQuoteExpired =
    activeQuote &&
    (activeQuote.status === "expired" ||
      (activeQuote.status === "sent" &&
        activeQuote.valid_until &&
        new Date(activeQuote.valid_until).getTime() <= Date.now()));

  const canCancel = !["completed", "declined", "cancelled"].includes(booking.status);

  const totalPaidMinor = payments.reduce(
    (sum, p) => sum + (p.is_refund ? -p.amount_minor : p.amount_minor),
    0
  );

  async function refreshStatus() {
    const res = await fetch(
      `/api/bookings/${encodeURIComponent(booking.reference)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );
    if (res.ok) {
      const updated = (await res.json()) as ClientBookingStatusView;
      setData(updated);
    } else {
      router.refresh();
    }
  }

  async function handleAcceptQuote() {
    if (!activeQuote) return;
    setAccepting(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);

    try {
      const res = await fetch(
        `/api/bookings/${encodeURIComponent(booking.reference)}/quote/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ quoteId: activeQuote.id }),
        }
      );
      const body = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) {
        setFeedbackError(body.detail ?? "Could not accept this quote.");
        await refreshStatus();
        return;
      }
      setFeedbackSuccess("Quote accepted. Follow the deposit instructions below to lock your date.");
      await refreshStatus();
    } catch {
      setFeedbackError("Network error while accepting quote. Please try again.");
    } finally {
      setAccepting(false);
    }
  }

  async function handleCancelBooking(e: React.FormEvent) {
    e.preventDefault();
    setCancelling(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);

    try {
      const res = await fetch(
        `/api/bookings/${encodeURIComponent(booking.reference)}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: cancelReason.trim() || undefined }),
        }
      );
      const body = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) {
        setFeedbackError(body.detail ?? "Could not cancel booking.");
        return;
      }
      setShowCancelForm(false);
      setFeedbackSuccess("Your request has been cancelled and our studio has been notified.");
      await refreshStatus();
    } catch {
      setFeedbackError("Network error while cancelling. Message us on WhatsApp if urgent.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 space-y-8">
      <header className="border-b border-[var(--hairline)] pb-6 space-y-2">
        <ShotCaption
          parts={[
            `REFERENCE ${booking.reference}`,
            booking.service_name,
            booking.occasion_name,
          ]}
        />
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
          {booking.headline}
        </h1>
        <p className="text-sm text-[var(--grey)]">
          For {booking.client_name} ·{" "}
          {booking.event_date
            ? `Event date: ${formatDisplayDate(booking.event_date)}`
            : booking.deadline
              ? `Deadline: ${formatDisplayDate(booking.deadline)}`
              : ""}
          {booking.venue_city ? ` · ${booking.venue_city}` : ""}
        </p>
      </header>

      {feedbackError && (
        <div role="alert" className="border-2 border-[var(--red)] bg-[var(--ink-2)] p-4 text-sm text-[var(--red)] flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-[var(--white)]">{feedbackError}</p>
        </div>
      )}

      {feedbackSuccess && (
        <div role="status" className="border-2 border-[var(--cyan)] bg-[var(--ink-2)] p-4 text-sm flex items-start gap-2.5">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--cyan)] mt-0.5" aria-hidden="true" />
          <p className="text-[var(--white)]">{feedbackSuccess}</p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left: Status Timeline */}
        <section className="lg:col-span-5 space-y-4">
          <h2 className="font-display text-xl font-bold">Timeline</h2>
          <ol className="space-y-4 border-l-2 border-[var(--hairline)] pl-4">
            {events.map((ev, idx) => {
              const isLatest = idx === events.length - 1;
              return (
                <li key={ev.id} className="relative">
                  <span
                    aria-hidden="true"
                    className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${
                      isLatest ? "bg-[var(--white)] ring-2 ring-[var(--white)]/20" : "bg-[var(--control-border)]"
                    }`}
                  />
                  <p className="font-mono-meta text-xs text-[var(--grey)]">
                    {formatAccraDateTime(ev.created_at)}
                  </p>
                  <p className="text-sm font-semibold text-[var(--white)]">
                    {ev.to_status
                      ? ev.to_status.charAt(0).toUpperCase() + ev.to_status.slice(1)
                      : ev.event_type.replace(/_/g, " ")}
                  </p>
                  {ev.note && (
                    <p className="mt-0.5 text-xs text-[var(--grey)]">{ev.note}</p>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="border border-[var(--hairline)] bg-[var(--ink-2)] p-4 space-y-3">
            <h3 className="font-display text-base font-bold">Need a change?</h3>
            <p className="text-xs text-[var(--grey)]">
              Message our desk on WhatsApp with your reference if your timing, venue, or scope shifts.
            </p>
            <ButtonLink
              href={waUrl}
              variant="secondary"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              <span>Ask for a change on WhatsApp</span>
            </ButtonLink>
          </div>
        </section>

        {/* Right: Active Quote, Deposit Instructions & Actions */}
        <section className="lg:col-span-7 space-y-6">
          {/* DEDICATED GALLERY DOWNLOAD CARD */}
          {(booking.gallery_url || booking.status === "completed") && (
            <div className="relative border-2 border-[var(--cyan)] bg-[var(--ink-2)] p-6 sm:p-8 space-y-6 shadow-[0_0_35px_rgba(0,229,255,0.22)]">
              {/* Viewfinder Corner brackets */}
              <span className="absolute -top-[2px] -left-[2px] h-3 w-3 border-t-2 border-l-2 border-[var(--cyan)]" />
              <span className="absolute -top-[2px] -right-[2px] h-3 w-3 border-t-2 border-r-2 border-[var(--cyan)]" />
              <span className="absolute -bottom-[2px] -left-[2px] h-3 w-3 border-b-2 border-l-2 border-[var(--cyan)]" />
              <span className="absolute -bottom-[2px] -right-[2px] h-3 w-3 border-b-2 border-r-2 border-[var(--cyan)]" />

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hairline)] pb-4">
                <span className="font-mono text-xs font-black uppercase tracking-widest text-[var(--cyan)]">
                  DELIVERABLES READY · SECURE CLIENT DOWNLOAD
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--grey)]">
                  REF: {booking.reference}
                </span>
              </div>

              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--white)] tracking-tight">
                  Your Studio Gallery & Deliverables
                </h2>
                <p className="mt-1 text-sm text-[var(--grey)] leading-relaxed">
                  Curated high-resolution photographs, cinematic master exports, and print-ready deliverables from your session.
                </p>
              </div>

              {booking.gallery_url ? (
                <div className="space-y-4">
                  {/* Primary CTA + Copy Button */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                    <a
                      href={booking.gallery_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[50px] flex-1 items-center justify-center gap-2.5 rounded-[2px] border-2 border-[var(--cyan)] bg-[var(--cyan)] px-6 py-3 font-display text-sm font-extrabold uppercase tracking-wider text-[var(--btn-action-text)] shadow-[0_0_25px_rgba(0,229,255,0.45)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <Download className="h-5 w-5 stroke-[2.5]" aria-hidden="true" />
                      <span>Download Studio Gallery</span>
                      <ExternalLink className="h-4 w-4 ml-0.5 opacity-80" aria-hidden="true" />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleCopy(booking.gallery_url!, "link")}
                      className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[2px] border-2 border-[var(--hairline)] bg-[var(--black)] px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)] transition-all cursor-pointer active:scale-[0.98]"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="h-4 w-4 text-[var(--cyan)]" />
                          <span className="text-[var(--cyan)]">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* PIN / Access Code Box */}
                  {booking.gallery_pin && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-[var(--cyan)]/40 bg-[var(--black)] p-4">
                      <div className="flex items-center gap-3">
                        <KeyRound className="h-4 w-4 text-[var(--cyan)] shrink-0" />
                        <div>
                          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--grey)]">
                            Gallery Access PIN / Password
                          </p>
                          <p className="font-mono text-lg font-black tracking-widest text-[var(--cyan)] select-all">
                            {booking.gallery_pin}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(booking.gallery_pin!, "pin")}
                        className="font-mono text-xs font-bold text-[var(--cyan)] hover:underline cursor-pointer"
                      >
                        {copiedPin ? "PIN Copied!" : "Copy PIN"}
                      </button>
                    </div>
                  )}

                  {/* Studio Notes & Download Advice */}
                  {booking.gallery_notes && (
                    <div className="rounded-[2px] border border-[var(--hairline)] bg-[var(--black)]/60 p-4 space-y-1">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--cyan)]">
                        Studio Notes
                      </p>
                      <p className="text-xs text-[var(--grey)] leading-relaxed whitespace-pre-wrap">
                        {booking.gallery_notes}
                      </p>
                    </div>
                  )}

                  {/* Expiry guidance & Mobile download tip */}
                  <div className="grid gap-3 sm:grid-cols-2 pt-1 text-xs text-[var(--grey)]">
                    <div className="border border-[var(--hairline)] bg-[var(--black)]/40 p-3">
                      <span className="font-bold text-[var(--white)] block mb-0.5">Full Resolution Files</span>
                      Suitable for large print framing, photo albums, and 4K digital displays.
                    </div>
                    <div className="border border-[var(--hairline)] bg-[var(--black)]/40 p-3">
                      <span className="font-bold text-[var(--white)] block mb-0.5">Mobile Download Tip</span>
                      Download full ZIP folders on Wi-Fi or open directly inside the cloud app.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[2px] border border-[var(--hairline)] bg-[var(--black)] p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[var(--cyan)]" />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--white)]">
                      Post-Production In Progress
                    </span>
                  </div>
                  <p className="text-xs text-[var(--grey)] leading-relaxed">
                    Our editing team is currently color grading and curating your deliverable files. Once finalized, your private cloud download link and access PIN will appear right here.
                  </p>
                </div>
              )}
            </div>
          )}
          {activeQuote ? (
            <div className="border border-[var(--hairline)] bg-[var(--ink-2)] p-6 text-[var(--white)] shadow-md space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--hairline)] pb-4">
                <div>
                  <p className="font-mono-meta text-xs uppercase tracking-wider text-[var(--cyan)] font-bold">
                    QUOTE VERSION {activeQuote.version}
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-extrabold text-[var(--white)]">
                    Itemised quote
                  </h2>
                </div>
                {activeQuote.valid_until && (
                  <p className="font-mono-meta text-xs text-[var(--grey)]">
                    Valid until {formatDisplayDate(activeQuote.valid_until)}
                  </p>
                )}
              </div>

              <div className="divide-y divide-[var(--hairline)]">
                {activeQuote.items.map((item) => (
                  <div key={item.id} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-[var(--white)]">{item.description}</p>
                      <p className="font-mono-meta text-xs text-[var(--grey)]">
                        {item.quantity} x {formatGhsFromMinor(item.unit_price_minor, activeQuote.currency)}
                      </p>
                    </div>
                    <p className="font-mono-meta font-semibold text-[var(--white)]">
                      {formatGhsFromMinor(item.line_total_minor, activeQuote.currency)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-[var(--hairline)] pt-4 space-y-1.5">
                <div className="flex justify-between text-base font-extrabold text-[var(--white)]">
                  <span>Total</span>
                  <span className="font-classica text-xl text-[var(--cyan)]">
                    {formatGhsFromMinor(activeQuote.total_minor, activeQuote.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-[var(--grey)]">
                  <span>Deposit to secure date</span>
                  <span className="font-semibold text-[var(--white)]">
                    {formatGhsFromMinor(activeQuote.deposit_minor, activeQuote.currency)}
                  </span>
                </div>
                {totalPaidMinor > 0 && (
                  <div className="flex justify-between text-sm text-[var(--cyan)] font-semibold">
                    <span>Recorded payments</span>
                    <span>{formatGhsFromMinor(totalPaidMinor, activeQuote.currency)}</span>
                  </div>
                )}
              </div>

              {activeQuote.notes && (
                <p className="border-t border-[var(--hairline)] pt-3 text-sm text-[var(--grey)]">
                  {activeQuote.notes}
                </p>
              )}

              <p className="text-xs text-[var(--grey)]">
                Acceptance is governed by our{" "}
                <Link href="/booking-policy" className="text-[var(--cyan)] underline underline-offset-4">
                  Booking, Cancellation and Refund Policy
                </Link>
                .
              </p>

              {isQuoteExpired && booking.status !== "accepted" && booking.status !== "confirmed" && (
                <div className="border border-[var(--red)] bg-[var(--red)]/10 p-3.5 text-sm text-[var(--red)]">
                  This quote has expired. Reply here or on WhatsApp and we will refresh it.
                </div>
              )}

              {booking.status === "quoted" && !isQuoteExpired && (
                <div className="pt-1">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleAcceptQuote}
                    disabled={accepting}
                    className="w-full"
                  >
                    {accepting ? "Accepting quote..." : "Accept this quote"}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="border border-[var(--hairline)] bg-[var(--ink-2)] p-6">
              <h2 className="font-display text-lg font-bold">Quote status</h2>
              <p className="mt-2 text-sm text-[var(--grey)]">
                We are reviewing your brief and schedule. Once your itemised quote is ready, it will appear right here and be emailed to you.
              </p>
            </div>
          )}

          {/* Deposit instructions shown once accepted */}
          {(booking.status === "accepted" || booking.status === "confirmed") && (
            <div className="border border-[var(--cyan)] bg-[var(--ink-2)] p-6 space-y-3">
              <ShotCaption parts={["DEPOSIT & PAYMENT DETAILS"]} />
              <h2 className="font-display text-xl font-bold">
                {booking.status === "confirmed"
                  ? "Booking confirmed"
                  : "Deposit instructions"}
              </h2>
              {booking.status === "confirmed" ? (
                <div className="space-y-1 text-sm text-[var(--white)]">
                  <p>Your deposit is recorded and your crew schedule is locked.</p>
                  {booking.starts_at && booking.ends_at && (
                    <p className="font-mono-meta text-xs text-[var(--cyan)] pt-1">
                      WINDOW: {formatAccraDateTime(booking.starts_at)} – {formatAccraDateTime(booking.ends_at)}
                    </p>
                  )}
                  {booking.venue_text && (
                    <p className="text-xs text-[var(--grey)]">Venue: {booking.venue_text}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2 text-sm text-[var(--grey)]">
                  <p className="text-[var(--white)]">
                    Send your deposit using either option below, then share the transaction reference on WhatsApp so we confirm your date.
                  </p>
                  <p>
                    <strong className="text-[var(--white)]">Mobile Money:</strong>{" "}
                    {settings.social.momo_number ?? settings.whatsapp_e164}
                  </p>
                  {settings.social.bank_details && (
                    <p>
                      <strong className="text-[var(--white)]">Bank transfer:</strong>{" "}
                      {settings.social.bank_details}
                    </p>
                  )}
                  <p>
                    <strong className="text-[var(--white)]">Payment reference:</strong>{" "}
                    <span className="font-mono-meta text-[var(--cyan)]">{booking.reference}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Cancel action */}
          {canCancel && (
            <div className="border border-[var(--hairline)] bg-[var(--ink-2)] p-5">
              {!showCancelForm ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-[var(--grey)]">
                    Need to withdraw this request?
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCancelForm(true)}
                  >
                    Cancel request
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleCancelBooking} className="space-y-4">
                  <FormField
                    id="cancel-reason"
                    label="Reason for cancelling"
                    helpText="Optional note for our team."
                  >
                    <textarea
                      id="cancel-reason"
                      rows={3}
                      maxLength={500}
                      className={TEXTAREA_CLASSES}
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="e.g. Date moved by family"
                    />
                  </FormField>
                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" variant="primary" disabled={cancelling}>
                      {cancelling ? "Cancelling..." : "Confirm cancellation"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowCancelForm(false)}
                    >
                      Keep request
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
