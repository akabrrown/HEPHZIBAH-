"use client";

import { AlertCircle, CheckCircle2, Download, ExternalLink, KeyRound, MessageCircle, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { FormField, INPUT_CLASSES, SELECT_CLASSES, TEXTAREA_CLASSES } from "@/components/ui/form-field";
import { ShotCaption } from "@/components/ui/viewfinder";
import {
  buildWhatsAppUrl,
  formatAccraDateTime,
  formatDisplayDate,
} from "@/lib/dates";
import { formatGhsFromMinor, fromMinorUnits, toMinorUnits } from "@/lib/money";
import type { BookingEventRecord, BookingRecord } from "@/modules/booking/schema";
import type { PackageItem } from "@/modules/catalog/schema";
import {
  paymentMethodValues,
  type PaymentMethod,
  type PaymentRecord,
  type QuoteRecord,
} from "@/modules/quoting/schema";

interface LineDraft {
  description: string;
  quantity: number;
  unitPriceGhs: string;
}

function toAccraDatetimeLocal(
  iso: string | null | undefined,
  fallbackDate?: string | null,
  fallbackTime = "09:00"
): string {
  if (iso) {
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 16);
    }
    return iso.replace(" ", "T").slice(0, 16);
  }
  if (fallbackDate) {
    return `${fallbackDate.slice(0, 10)}T${fallbackTime}`;
  }
  return "";
}

export function BookingDetailClient({
  booking,
  events,
  quotes,
  payments,
  servicePackages,
  whatsappE164: _whatsappE164,
  defaultValidDays,
}: {
  booking: BookingRecord;
  events: BookingEventRecord[];
  quotes: QuoteRecord[];
  payments: PaymentRecord[];
  servicePackages: PackageItem[];
  whatsappE164: string;
  defaultValidDays: number;
}) {
  const router = useRouter();
  const draftQuote = quotes.find((q) => q.status === "draft") ?? null;
  const sentQuote = quotes.find((q) => q.status === "sent") ?? null;
  const acceptedQuote = quotes.find((q) => q.id === booking.accepted_quote_id) ?? quotes.find((q) => q.status === "accepted") ?? null;
  const expiredQuote = quotes.find((q) => q.status === "expired") ?? null;

  const matchedPkg = booking.package_id
    ? servicePackages.find((p) => p.id === booking.package_id)
    : undefined;

  const [lines, setLines] = useState<LineDraft[]>(() => {
    if (draftQuote && draftQuote.items.length > 0) {
      return draftQuote.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPriceGhs: String(fromMinorUnits(item.unit_price_minor)),
      }));
    }
    if (matchedPkg) {
      return [
        {
          description: matchedPkg.name,
          quantity: 1,
          unitPriceGhs: String(fromMinorUnits(matchedPkg.price_minor)),
        },
      ];
    }
    return [{ description: booking.service_name ?? "Studio coverage", quantity: 1, unitPriceGhs: "2500" }];
  });

  const [depositGhs, setDepositGhs] = useState<string>(() =>
    draftQuote ? String(fromMinorUnits(draftQuote.deposit_minor)) : "1000"
  );
  const [quoteNotes, setQuoteNotes] = useState<string>(draftQuote?.notes ?? "");
  const [validDays, setValidDays] = useState<string>(String(defaultValidDays));

  const [startsAtLocal, setStartsAtLocal] = useState<string>(() =>
    toAccraDatetimeLocal(booking.starts_at, booking.event_date, "09:00")
  );
  const [endsAtLocal, setEndsAtLocal] = useState<string>(() =>
    toAccraDatetimeLocal(booking.ends_at, booking.event_date, "17:00")
  );

  // Payment recorder state
  const [payMethod, setPayMethod] = useState<PaymentMethod>("momo");
  const [payAmountGhs, setPayAmountGhs] = useState<string>(() =>
    acceptedQuote ? String(fromMinorUnits(acceptedQuote.deposit_minor)) : "1000"
  );
  const [payRef, setPayRef] = useState("");
  const [payNote, setPayNote] = useState("");
  const [isRefund, setIsRefund] = useState(false);

  // Destructive confirm state
  const [actionMode, setActionMode] = useState<"none" | "decline" | "cancel">("none");
  const [actionReason, setActionReason] = useState("");

  const [busy, setBusy] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);
  const [rotatedLink, setRotatedLink] = useState<string | null>(null);

  // Gallery delivery state
  const [galleryUrl, setGalleryUrl] = useState(booking.gallery_url ?? "");
  const [galleryPin, setGalleryPin] = useState(booking.gallery_pin ?? "");
  const [galleryNotes, setGalleryNotes] = useState(booking.gallery_notes ?? "");
  const [galleryExpiresAt, setGalleryExpiresAt] = useState(() =>
    booking.gallery_expires_at ? booking.gallery_expires_at.slice(0, 16) : ""
  );
  const [markCompleteWithGallery, setMarkCompleteWithGallery] = useState(false);
  const [galleryBusy, setGalleryBusy] = useState(false);

  const computedTotalMinor = lines.reduce((sum, l) => {
    const unitMinor = toMinorUnits(Number(l.unitPriceGhs) || 0);
    return sum + Math.round((Number(l.quantity) || 0) * unitMinor);
  }, 0);

  const netPaidMinor = payments.reduce(
    (sum, p) => sum + (p.is_refund ? -p.amount_minor : p.amount_minor),
    0
  );

  const clientWaUrl = buildWhatsAppUrl(
    booking.client_phone,
    `Hello ${booking.client_name}, this is Hephzibah Media regarding your booking ${booking.reference}.`
  );

  function toAccraIso(localDt: string): string | null {
    if (!localDt) return null;
    const normalized = localDt.trim().replace(" ", "T");
    // Ghana observes GMT+00:00 year-round
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
      return `${normalized}:00Z`;
    }
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  async function saveDraftQuote(): Promise<string | null> {
    setBusy(true);
    setAlertError(null);
    setAlertSuccess(null);
    try {
      const payload = {
        quote_id: draftQuote?.id,
        items: lines.map((l) => ({
          description: l.description.trim(),
          quantity: Number(l.quantity) || 1,
          unit_price_minor: toMinorUnits(Number(l.unitPriceGhs) || 0),
        })),
        deposit_minor: toMinorUnits(Number(depositGhs) || 0),
        notes: quoteNotes.trim() || null,
        starts_at: booking.kind !== "design" && startsAtLocal ? toAccraIso(startsAtLocal) : null,
        ends_at: booking.kind !== "design" && endsAtLocal ? toAccraIso(endsAtLocal) : null,
      };
      const res = await fetch(`/api/admin/bookings/${booking.id}/quotes`, {
        method: draftQuote ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; detail?: string };
      if (!res.ok) {
        setAlertError(body.detail ?? "Could not save draft quote.");
        return null;
      }
      setAlertSuccess("Draft quote saved.");
      router.refresh();
      return body.id ?? null;
    } catch {
      setAlertError("Network error while saving quote.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveAndSendQuote() {
    const savedId = await saveDraftQuote();
    const targetId = savedId ?? draftQuote?.id;
    if (!targetId) return;

    setBusy(true);
    setAlertError(null);
    try {
      const res = await fetch(
        `/api/admin/bookings/${booking.id}/quotes/${targetId}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ validDays: Number(validDays) || defaultValidDays }),
        }
      );
      const body = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) {
        setAlertError(body.detail ?? "Could not send quote.");
        return;
      }
      setAlertSuccess("Quote sent and prices frozen.");
      router.refresh();
    } catch {
      setAlertError("Network error while sending quote.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReviseQuote(quoteId: string) {
    setBusy(true);
    setAlertError(null);
    setAlertSuccess(null);
    try {
      const res = await fetch(
        `/api/admin/bookings/${booking.id}/quotes/${quoteId}/revise`,
        { method: "POST" }
      );
      const body = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) {
        setAlertError(body.detail ?? "Could not revise quote.");
        return;
      }
      setAlertSuccess("Previous quote superseded; new draft created.");
      router.refresh();
    } catch {
      setAlertError("Network error while revising quote.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setAlertError(null);
    setAlertSuccess(null);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: payMethod,
          amount_minor: toMinorUnits(Number(payAmountGhs) || 0),
          is_refund: isRefund,
          provider_reference: payRef.trim() || null,
          received_at: new Date().toISOString(),
          note: payNote.trim() || null,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) {
        setAlertError(body.detail ?? "Could not record payment.");
        return;
      }
      setPayRef("");
      setPayNote("");
      setAlertSuccess(isRefund ? "Refund entry recorded." : "Deposit payment recorded.");
      router.refresh();
    } catch {
      setAlertError("Network error while recording payment.");
    } finally {
      setBusy(false);
    }
  }

  async function handleTransition(
    to: "confirmed" | "completed" | "declined" | "cancelled",
    note?: string
  ) {
    setBusy(true);
    setAlertError(null);
    setAlertSuccess(null);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          note,
          startsAt: booking.kind !== "design" && startsAtLocal ? toAccraIso(startsAtLocal) : undefined,
          endsAt: booking.kind !== "design" && endsAtLocal ? toAccraIso(endsAtLocal) : undefined,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) {
        setAlertError(body.detail ?? "Transition refused.");
        return;
      }
      setActionMode("none");
      setActionReason("");
      setAlertSuccess(`Booking moved to ${to}.`);
      router.refresh();
    } catch {
      setAlertError("Network error while updating status.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRotateToken() {
    setBusy(true);
    setAlertError(null);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/token/rotate`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => ({}))) as {
        statusUrl?: string;
        detail?: string;
      };
      if (!res.ok) {
        setAlertError(body.detail ?? "Could not rotate link.");
        return;
      }
      setRotatedLink(body.statusUrl ?? null);
      setAlertSuccess("New status link generated and emailed to client.");
      router.refresh();
    } catch {
      setAlertError("Network error rotating token.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveGallery(e: React.FormEvent) {
    e.preventDefault();
    setGalleryBusy(true);
    setAlertError(null);
    setAlertSuccess(null);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          galleryUrl: galleryUrl.trim() || null,
          galleryPin: galleryPin.trim() || null,
          galleryNotes: galleryNotes.trim() || null,
          galleryExpiresAt: galleryExpiresAt ? new Date(galleryExpiresAt).toISOString() : null,
          markCompleted: markCompleteWithGallery,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAlertError(data.detail ?? "Failed to save gallery delivery.");
        return;
      }
      setAlertSuccess("Client gallery deliverables updated successfully. Visible on client status page.");
      router.refresh();
    } catch {
      setAlertError("Network error while saving gallery deliverables.");
    } finally {
      setGalleryBusy(false);
    }
  }

  const canEditQuote = ["new", "reviewing", "expired"].includes(booking.status);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--hairline)] pb-5">
        <div>
          <Link href="/admin/bookings" className="text-xs text-[var(--cyan)] underline underline-offset-4">
            Back to bookings
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <ShotCaption parts={[booking.reference, `STATUS: ${booking.status}`, booking.kind]} />
          </div>
          <h1 className="mt-1 font-display text-3xl font-extrabold">
            {booking.client_name} — {booking.service_name ?? booking.kind}
          </h1>
          <p className="mt-1 text-sm text-[var(--grey)]">
            {booking.event_date
              ? `Event date: ${formatDisplayDate(booking.event_date)} (${booking.time_of_day ?? "unsure"})`
              : `Design deadline: ${formatDisplayDate(booking.deadline)}`}
            {booking.venue_city ? ` · ${booking.venue_city}` : ""}
            {booking.venue_text ? ` (${booking.venue_text})` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <ButtonLink href={clientWaUrl} variant="secondary" target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span>WhatsApp client</span>
          </ButtonLink>
          <Button type="button" variant="secondary" onClick={handleRotateToken} disabled={busy}>
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            <span>Rotate status link</span>
          </Button>
        </div>
      </div>

      {alertError && (
        <div role="alert" className="border-2 border-[var(--red)] bg-[var(--ink-2)] p-4 text-sm flex items-start gap-2">
          <AlertCircle className="h-5 w-5 shrink-0 text-[var(--red)]" aria-hidden="true" />
          <span className="text-[var(--white)]">{alertError}</span>
        </div>
      )}

      {alertSuccess && (
        <div role="status" className="border-2 border-[var(--cyan)] bg-[var(--ink-2)] p-4 text-sm flex items-start gap-2">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--cyan)]" aria-hidden="true" />
          <div className="space-y-1">
            <p>{alertSuccess}</p>
            {rotatedLink && (
              <p className="font-mono-meta text-xs text-[var(--cyan)] break-all">{rotatedLink}</p>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        {/* LEFT: Brief, client info & timeline */}
        <div className="lg:col-span-5 space-y-6">
          <section className="border border-[var(--hairline)] bg-[var(--ink-2)] p-5 space-y-3 text-sm">
            <h2 className="font-display text-lg font-bold">Client brief</h2>
            <p className="whitespace-pre-wrap text-[var(--white)] leading-relaxed">{booking.brief}</p>
            <dl className="grid grid-cols-2 gap-2 border-t border-[var(--hairline)] pt-3 text-xs">
              <dt className="text-[var(--grey)]">Email</dt>
              <dd>{booking.client_email}</dd>
              <dt className="text-[var(--grey)]">Phone</dt>
              <dd className="font-mono-meta">{booking.client_phone}</dd>
              <dt className="text-[var(--grey)]">Preferred contact</dt>
              <dd className="capitalize">{booking.preferred_contact}</dd>
              <dt className="text-[var(--grey)]">Occasion</dt>
              <dd>{booking.occasion_name ?? booking.occasion_other ?? "—"}</dd>
              <dt className="text-[var(--grey)]">Package chosen</dt>
              <dd>{booking.package_name ?? "Not sure yet"}</dd>
              <dt className="text-[var(--grey)]">Budget band</dt>
              <dd>{booking.budget_band ?? "—"}</dd>
              <dt className="text-[var(--grey)]">Guests</dt>
              <dd>{booking.guest_count ?? "—"}</dd>
              <dt className="text-[var(--grey)]">Consent</dt>
              <dd>
                Privacy {booking.privacy_version} · Terms {booking.terms_version}
              </dd>
            </dl>
            {booking.reference_links.length > 0 && (
              <div className="border-t border-[var(--hairline)] pt-3">
                <p className="text-xs font-semibold text-[var(--grey)] mb-1">Reference links</p>
                <ul className="space-y-1">
                  {booking.reference_links.map((url) => (
                    <li key={url} className="truncate text-xs">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--cyan)] underline"
                      >
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="border border-[var(--hairline)] bg-[var(--ink-2)] p-5 space-y-4">
            <h2 className="font-display text-lg font-bold">Audit timeline</h2>
            <ol className="space-y-3 border-l-2 border-[var(--hairline)] pl-4">
              {events.map((ev) => (
                <li key={ev.id} className="relative text-xs">
                  <span
                    aria-hidden="true"
                    className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[var(--white)] ring-2 ring-[var(--white)]/20"
                  />
                  <p className="font-mono-meta text-[var(--grey)]">
                    {formatAccraDateTime(ev.created_at)} · {ev.actor_type}
                    {ev.actor_name ? ` (${ev.actor_name})` : ""}
                  </p>
                  <p className="font-semibold text-[var(--white)]">
                    {ev.event_type.replace(/_/g, " ")}
                    {ev.from_status && ev.to_status
                      ? ` (${ev.from_status} -> ${ev.to_status})`
                      : ""}
                  </p>
                  {ev.note && <p className="text-[var(--grey)]">{ev.note}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* RIGHT: Quote builder, payments, confirmation & destructive actions */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active sent or accepted quote summary */}
          {(sentQuote || acceptedQuote || expiredQuote) && (
            <section className="border border-[var(--cyan)] bg-[var(--ink-2)] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <ShotCaption
                    parts={[
                      `QUOTE V${(acceptedQuote ?? sentQuote ?? expiredQuote)!.version}`,
                      `STATUS: ${(acceptedQuote ?? sentQuote ?? expiredQuote)!.status.toUpperCase()}`,
                    ]}
                  />
                  <h2 className="mt-1 font-display text-xl font-bold">
                    {formatGhsFromMinor((acceptedQuote ?? sentQuote ?? expiredQuote)!.total_minor)}
                  </h2>
                  <p className="text-xs text-[var(--grey)]">
                    Deposit required:{" "}
                    {formatGhsFromMinor((acceptedQuote ?? sentQuote ?? expiredQuote)!.deposit_minor)}
                    {(acceptedQuote ?? sentQuote ?? expiredQuote)!.valid_until
                      ? ` · Valid until ${formatDisplayDate((acceptedQuote ?? sentQuote ?? expiredQuote)!.valid_until)}`
                      : ""}
                  </p>
                </div>

                {(sentQuote || expiredQuote) && !acceptedQuote && (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => handleReviseQuote((sentQuote ?? expiredQuote)!.id)}
                  >
                    Create revised quote
                  </Button>
                )}
              </div>

              <div className="divide-y divide-[var(--hairline)] border-t border-[var(--hairline)] pt-2 text-sm">
                {(acceptedQuote ?? sentQuote ?? expiredQuote)!.items.map((item) => (
                  <div key={item.id} className="flex justify-between py-2">
                    <span>
                      {item.description} ({item.quantity} x{" "}
                      {formatGhsFromMinor(item.unit_price_minor)})
                    </span>
                    <span className="font-mono-meta">
                      {formatGhsFromMinor(item.line_total_minor)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Draft quote builder */}
          {canEditQuote && (
            <section className="border border-[var(--hairline)] bg-[var(--ink-2)] p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-xl font-bold">
                  {draftQuote ? `Edit draft quote v${draftQuote.version}` : "Build quote"}
                </h2>
                {servicePackages.length > 0 && (
                  <select
                    aria-label="Copy items from package"
                    className="min-h-[40px] border border-[var(--control-border)] bg-[var(--black)] px-2.5 text-xs text-[var(--white)]"
                    defaultValue=""
                    onChange={(e) => {
                      const pkg = servicePackages.find((p) => p.id === e.target.value);
                      if (pkg) {
                        setLines([
                          {
                            description: pkg.name,
                            quantity: 1,
                            unitPriceGhs: String(fromMinorUnits(pkg.price_minor)),
                          },
                        ]);
                      }
                    }}
                  >
                    <option value="">Load package price...</option>
                    {servicePackages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatGhsFromMinor(p.price_minor)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-3">
                {lines.map((line, idx) => (
                  <div key={idx} className="grid gap-2 sm:grid-cols-12 items-end border border-[var(--hairline)] bg-[var(--black)] p-3">
                    <div className="sm:col-span-6">
                      <label className="mb-1 block text-xs text-[var(--grey)]">Description</label>
                      <input
                        type="text"
                        className={INPUT_CLASSES}
                        value={line.description}
                        onChange={(e) => {
                          const next = [...lines];
                          next[idx] = { ...line, description: e.target.value };
                          setLines(next);
                        }}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs text-[var(--grey)]">Qty</label>
                      <input
                        type="number"
                        min={1}
                        step="0.5"
                        className={INPUT_CLASSES}
                        value={line.quantity}
                        onChange={(e) => {
                          const next = [...lines];
                          next[idx] = { ...line, quantity: Number(e.target.value) };
                          setLines(next);
                        }}
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="mb-1 block text-xs text-[var(--grey)]">Unit GHS</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className={INPUT_CLASSES}
                        value={line.unitPriceGhs}
                        onChange={(e) => {
                          const next = [...lines];
                          next[idx] = { ...line, unitPriceGhs: e.target.value };
                          setLines(next);
                        }}
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        disabled={lines.length <= 1}
                        aria-label="Remove line"
                        onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                        className="inline-flex h-[48px] w-[44px] items-center justify-center text-[var(--grey)] hover:text-[var(--red)] disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setLines([...lines, { description: "", quantity: 1, unitPriceGhs: "0" }])
                  }
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Add line item</span>
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id="quote-deposit" label="Required deposit (GHS)" required>
                  <input
                    id="quote-deposit"
                    type="number"
                    min={0}
                    step="0.01"
                    className={INPUT_CLASSES}
                    value={depositGhs}
                    onChange={(e) => setDepositGhs(e.target.value)}
                  />
                </FormField>

                <FormField id="quote-valid-days" label="Valid for (days)" required>
                  <input
                    id="quote-valid-days"
                    type="number"
                    min={1}
                    max={60}
                    className={INPUT_CLASSES}
                    value={validDays}
                    onChange={(e) => setValidDays(e.target.value)}
                  />
                </FormField>
              </div>

              {booking.kind !== "design" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField id="window-start" label="Proposed shoot start (GMT)">
                    <input
                      id="window-start"
                      type="datetime-local"
                      className={INPUT_CLASSES}
                      value={startsAtLocal}
                      onChange={(e) => setStartsAtLocal(e.target.value)}
                    />
                  </FormField>
                  <FormField id="window-end" label="Proposed shoot end (GMT)">
                    <input
                      id="window-end"
                      type="datetime-local"
                      className={INPUT_CLASSES}
                      value={endsAtLocal}
                      onChange={(e) => setEndsAtLocal(e.target.value)}
                    />
                  </FormField>
                </div>
              )}

              <FormField id="quote-notes" label="Notes shown to client">
                <textarea
                  id="quote-notes"
                  rows={2}
                  className={TEXTAREA_CLASSES}
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  placeholder="Delivery timeline, transport notes, or inclusions."
                />
              </FormField>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--hairline)] pt-4">
                <p className="font-display text-lg font-bold">
                  Total: {formatGhsFromMinor(computedTotalMinor)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={saveDraftQuote} disabled={busy}>
                    Save draft
                  </Button>
                  <Button type="button" variant="primary" onClick={handleSaveAndSendQuote} disabled={busy}>
                    Send quote to client
                  </Button>
                </div>
              </div>
            </section>
          )}

          {/* Payments recorder (append-only) */}
          <section className="border border-[var(--hairline)] bg-[var(--ink-2)] p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl font-bold">Deposits &amp; payments</h2>
              <span className="font-mono-meta text-sm text-[var(--cyan)]">
                Net paid: {formatGhsFromMinor(netPaidMinor)}
              </span>
            </div>

            {payments.length > 0 && (
              <ul className="divide-y divide-[var(--hairline)] border border-[var(--hairline)] bg-[var(--black)] px-4">
                {payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2.5 text-xs">
                    <div>
                      <span className="font-mono-meta uppercase text-[var(--white)]">
                        {p.is_refund ? "REFUND" : "PAYMENT"} · {p.method}
                      </span>
                      {p.provider_reference && (
                        <span className="ml-2 text-[var(--grey)]">Ref: {p.provider_reference}</span>
                      )}
                      {p.note && <p className="text-[var(--grey)]">{p.note}</p>}
                    </div>
                    <span className={p.is_refund ? "text-[var(--red)] font-mono-meta" : "text-[var(--cyan)] font-mono-meta"}>
                      {p.is_refund ? "-" : "+"}
                      {formatGhsFromMinor(p.amount_minor, p.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={handleRecordPayment} className="grid gap-3 sm:grid-cols-2">
              <FormField id="pay-method" label="Method" required>
                <select
                  id="pay-method"
                  className={SELECT_CLASSES}
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                >
                  {paymentMethodValues.map((m) => (
                    <option key={m} value={m}>
                      {m === "momo" ? "Mobile Money (MoMo)" : m.replace("_", " ").toUpperCase()}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField id="pay-amount" label="Amount (GHS)" required>
                <input
                  id="pay-amount"
                  type="number"
                  min={1}
                  step="0.01"
                  required
                  className={INPUT_CLASSES}
                  value={payAmountGhs}
                  onChange={(e) => setPayAmountGhs(e.target.value)}
                />
              </FormField>

              <FormField id="pay-ref" label="MoMo / Bank reference">
                <input
                  id="pay-ref"
                  type="text"
                  className={INPUT_CLASSES}
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. MOMO-992104"
                />
              </FormField>

              <FormField id="pay-note" label="Note">
                <input
                  id="pay-note"
                  type="text"
                  className={INPUT_CLASSES}
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                />
              </FormField>

              <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-1">
                <label className="flex items-center gap-2 text-xs text-[var(--grey)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRefund}
                    onChange={(e) => setIsRefund(e.target.checked)}
                    className="h-4 w-4 accent-[var(--red)]"
                  />
                  <span>Record as refund correction entry</span>
                </label>
                <Button type="submit" variant="secondary" disabled={busy}>
                  {isRefund ? "Record refund" : "Record payment"}
                </Button>
              </div>
            </form>
          </section>

          {/* Client Gallery & Deliverables Delivery Card */}
          <section className="border-2 border-[var(--cyan)]/60 bg-[var(--ink-2)] p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--hairline)] pb-3">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-[var(--cyan)]" />
                <h2 className="font-display text-xl font-bold">Client Gallery & Deliverables</h2>
              </div>
              {booking.gallery_url ? (
                <span className="rounded bg-[var(--cyan)] px-2.5 py-0.5 font-mono text-xs font-black uppercase tracking-wider text-[var(--btn-action-text)]">
                  ACTIVE GALLERY
                </span>
              ) : (
                <span className="rounded bg-[var(--black)] border border-[var(--hairline)] px-2.5 py-0.5 font-mono text-xs font-bold uppercase tracking-wider text-[var(--grey)]">
                  PENDING DELIVERY
                </span>
              )}
            </div>

            <p className="text-xs text-[var(--grey)] leading-relaxed">
              Attach the client&apos;s finished gallery download link (Google Drive, Pixieset, Dropbox, WeTransfer). Once saved, it immediately activates the dedicated Gallery Download Card on the client&apos;s status page.
            </p>

            <form onSubmit={handleSaveGallery} className="space-y-4">
              <FormField
                id="gallery-url"
                label="Private Gallery / Download URL"
                helpText="Google Drive folder, Pixieset collection, Dropbox transfer, etc."
                required
              >
                <input
                  id="gallery-url"
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/... or https://pixieset.com/..."
                  className={INPUT_CLASSES}
                  value={galleryUrl}
                  onChange={(e) => setGalleryUrl(e.target.value)}
                />
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  id="gallery-pin"
                  label="Access PIN / Password (Optional)"
                  helpText="If your gallery is PIN or password protected."
                >
                  <input
                    id="gallery-pin"
                    type="text"
                    maxLength={60}
                    placeholder="e.g. 8492 or HEPHZIBAH2026"
                    className={INPUT_CLASSES}
                    value={galleryPin}
                    onChange={(e) => setGalleryPin(e.target.value)}
                  />
                </FormField>

                <FormField
                  id="gallery-expires"
                  label="Link Expiry (Optional)"
                  helpText="Date and time when client access expires."
                >
                  <input
                    id="gallery-expires"
                    type="datetime-local"
                    className={INPUT_CLASSES}
                    value={galleryExpiresAt}
                    onChange={(e) => setGalleryExpiresAt(e.target.value)}
                  />
                </FormField>
              </div>

              <FormField
                id="gallery-notes"
                label="Studio Delivery Notes & Instructions"
                helpText="Visible to the client in their download card (e.g. photo count, resolutions, printing tips)."
              >
                <textarea
                  id="gallery-notes"
                  rows={2}
                  maxLength={2000}
                  placeholder="e.g. Full color graded master gallery. Raw files and web-ready crops included. Please download within 90 days."
                  className={TEXTAREA_CLASSES}
                  value={galleryNotes}
                  onChange={(e) => setGalleryNotes(e.target.value)}
                />
              </FormField>

              {booking.status === "confirmed" && (
                <label className="flex items-center gap-2 text-xs text-[var(--cyan)] cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={markCompleteWithGallery}
                    onChange={(e) => setMarkCompleteWithGallery(e.target.checked)}
                    className="h-4 w-4 accent-[var(--cyan)]"
                  />
                  <span>Mark booking as &ldquo;Completed&rdquo; upon saving this gallery</span>
                </label>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--hairline)]">
                {galleryUrl ? (
                  <a
                    href={galleryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--cyan)] hover:underline"
                  >
                    <span>Test gallery link</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <span />
                )}

                <Button type="submit" variant="cyan" disabled={galleryBusy}>
                  {galleryBusy ? "Saving deliverables..." : "Save Gallery Deliverables"}
                </Button>
              </div>
            </form>
          </section>

          {/* Confirm / Complete / Decline / Cancel controls */}
          <section className="border border-[var(--hairline)] bg-[var(--ink-2)] p-5 space-y-5">
            <h2 className="font-display text-xl font-bold">Booking actions</h2>

            {booking.status === "accepted" && (
              <div className="space-y-4 border border-[var(--cyan)] bg-[var(--black)] p-4">
                <p className="text-sm text-[var(--white)]">
                  Confirming locks this crew window on the public calendar and emails confirmation to the client.
                </p>
                {booking.kind !== "design" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField id="confirm-start" label="Work window start (GMT)" required>
                      <input
                        id="confirm-start"
                        type="datetime-local"
                        className={INPUT_CLASSES}
                        value={startsAtLocal}
                        onChange={(e) => setStartsAtLocal(e.target.value)}
                      />
                    </FormField>
                    <FormField id="confirm-end" label="Work window end (GMT)" required>
                      <input
                        id="confirm-end"
                        type="datetime-local"
                        className={INPUT_CLASSES}
                        value={endsAtLocal}
                        onChange={(e) => setEndsAtLocal(e.target.value)}
                      />
                    </FormField>
                  </div>
                )}
                <Button
                  type="button"
                  variant="primary"
                  disabled={busy}
                  onClick={() => handleTransition("confirmed")}
                >
                  Confirm booking
                </Button>
              </div>
            )}

            {booking.status === "confirmed" && (
              <div className="flex flex-wrap items-center justify-between gap-3 border border-[var(--hairline)] bg-[var(--black)] p-4">
                <p className="text-sm text-[var(--grey)]">
                  Mark deliverables finished after the shoot or deadline date has passed.
                </p>
                <Button
                  type="button"
                  variant="primary"
                  disabled={busy}
                  onClick={() => handleTransition("completed", "Job delivered and closed.")}
                >
                  Mark completed
                </Button>
              </div>
            )}

            {!["completed", "declined", "cancelled"].includes(booking.status) && (
              <div className="space-y-3 pt-1">
                {actionMode === "none" ? (
                  <div className="flex flex-wrap gap-3">
                    {["new", "reviewing", "quoted"].includes(booking.status) && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setActionMode("decline")}
                      >
                        Decline request
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setActionMode("cancel")}
                    >
                      Cancel booking
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 border border-[var(--red)] bg-[var(--black)] p-4">
                    <FormField
                      id="action-reason"
                      label={
                        actionMode === "decline"
                          ? "Reason for declining (sent to client)"
                          : "Reason for cancellation (sent to client)"
                      }
                      required
                    >
                      <textarea
                        id="action-reason"
                        rows={2}
                        className={TEXTAREA_CLASSES}
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        placeholder="Explain clearly in plain language..."
                      />
                    </FormField>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        disabled={busy || actionReason.trim().length < 3}
                        onClick={() =>
                          handleTransition(
                            actionMode === "decline" ? "declined" : "cancelled",
                            actionReason.trim()
                          )
                        }
                      >
                        Confirm {actionMode}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setActionMode("none");
                          setActionReason("");
                        }}
                      >
                        Back
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
