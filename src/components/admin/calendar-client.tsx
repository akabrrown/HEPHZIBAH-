"use client";

import { AlertCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, INPUT_CLASSES } from "@/components/ui/form-field";
import { formatAccraDateTime, formatDisplayDate } from "@/lib/dates";
import type { BlockedDateRange, BookingRecord } from "@/modules/booking/schema";

export function AdminCalendarClient({
  bookings,
  blockedDates,
}: {
  bookings: BookingRecord[];
  blockedDates: BlockedDateRange[];
}) {
  const router = useRouter();
  const [fromDate, setFromDate] = useState("");
  const [toDateInclusive, setToDateInclusive] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddBlocked(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/blocked-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate,
          toDateInclusive: toDateInclusive || fromDate,
          reason: reason.trim(),
        }),
      });
      const body = (await res.json().catch(() => null)) as {
        detail?: string;
        fieldErrors?: Record<string, string[]>;
      } | null;
      if (!res.ok) {
        const fieldMsg = body?.fieldErrors
          ? Object.entries(body.fieldErrors)
              .filter(([, errs]) => Array.isArray(errs) && errs.length > 0)
              .map(([field, errs]) => `${field}: ${errs.join(", ")}`)
              .join(" | ")
          : "";
        setError(fieldMsg || body?.detail || "Could not block dates.");
        return;
      }
      setFromDate("");
      setToDateInclusive("");
      setReason("");
      router.refresh();
    } catch {
      setError("Network error while blocking dates.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveBlocked(id: string, rangeLabel: string) {
    if (!window.confirm(`Unblock "${rangeLabel}" so clients can request bookings on these dates?`)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/blocked-dates?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const body = (await res.json().catch(() => null)) as { detail?: string } | null;
      if (!res.ok) {
        setError(body?.detail ?? "Could not remove blocked range.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not remove blocked range.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-extrabold">Calendar &amp; blocked dates</h1>
        <p className="mt-1 text-sm text-[var(--grey)]">
          Confirmed crew jobs and blocked ranges disappear from the public booking calendar immediately.
        </p>
      </header>

      {error && (
        <div role="alert" className="border-2 border-[var(--red)] bg-[var(--ink-2)] p-4 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-[var(--red)] shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Scheduled bookings */}
        <section className="lg:col-span-7 border border-[var(--hairline)] bg-[var(--ink-2)] p-5 space-y-4">
          <h2 className="font-display text-xl font-bold">
            Upcoming quoted, accepted &amp; confirmed jobs ({bookings.length})
          </h2>
          {bookings.length === 0 ? (
            <p className="text-sm text-[var(--grey)]">No scheduled jobs in this 90-day window.</p>
          ) : (
            <ul className="divide-y divide-[var(--hairline)]">
              {bookings.map((b) => (
                <li key={b.id} className="py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div>
                    <Link
                      href={`/admin/bookings/${b.id}`}
                      className="font-semibold text-[var(--white)] hover:text-[var(--cyan)]"
                    >
                      <span className="font-mono-meta text-xs text-[var(--cyan)] mr-2">
                        {b.reference}
                      </span>
                      {b.client_name}
                    </Link>
                    <p className="text-xs text-[var(--grey)]">
                      {b.service_name} · {b.venue_city ?? "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="block font-mono-meta text-xs uppercase text-[var(--white)]">
                      {b.status}
                    </span>
                    <span className="font-mono-meta text-xs text-[var(--grey)]">
                      {b.starts_at
                        ? formatAccraDateTime(b.starts_at)
                        : formatDisplayDate(b.event_date ?? b.deadline)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Blocked dates manager */}
        <section className="lg:col-span-5 space-y-6">
          <form
            onSubmit={handleAddBlocked}
            className="border border-[var(--hairline)] bg-[var(--ink-2)] p-5 space-y-4"
          >
            <h2 className="font-display text-xl font-bold">Block dates</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id="block-from" label="From date" required>
                <input
                  id="block-from"
                  type="date"
                  required
                  className={INPUT_CLASSES}
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </FormField>
              <FormField id="block-to" label="Through date">
                <input
                  id="block-to"
                  type="date"
                  min={fromDate || undefined}
                  className={INPUT_CLASSES}
                  value={toDateInclusive}
                  onChange={(e) => setToDateInclusive(e.target.value)}
                />
              </FormField>
            </div>
            <FormField
              id="block-reason"
              label="Private reason"
              required
              helpText="Shown to admins only, never public."
            >
              <input
                id="block-reason"
                type="text"
                required
                minLength={2}
                className={INPUT_CLASSES}
                placeholder="e.g. Holiday, equipment servicing"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </FormField>
            <Button type="submit" variant="primary" disabled={busy}>
              Block date range
            </Button>
          </form>

          <div className="border border-[var(--hairline)] bg-[var(--ink-2)] p-5 space-y-3">
            <h2 className="font-display text-lg font-bold">
              Active blocked ranges ({blockedDates.length})
            </h2>
            {blockedDates.length === 0 ? (
              <p className="text-sm text-[var(--grey)]">No dates blocked manually.</p>
            ) : (
              <ul className="divide-y divide-[var(--hairline)]">
                {blockedDates.map((range) => (
                  <li key={range.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                    <div>
                      <p className="font-mono-meta text-xs text-[var(--white)]">
                        {formatDisplayDate(range.from_date)} &ndash;{" "}
                        {formatDisplayDate(range.to_date_inclusive)}
                      </p>
                      <p className="text-xs text-[var(--grey)]">{range.reason}</p>
                    </div>
                    <button
                      type="button"
                      aria-label="Unblock range"
                      disabled={busy}
                      onClick={() =>
                        handleRemoveBlocked(
                          range.id,
                          `${formatDisplayDate(range.from_date)} - ${formatDisplayDate(range.to_date_inclusive)}`
                        )
                      }
                      className="inline-flex h-[40px] w-[40px] items-center justify-center text-[var(--grey)] hover:text-[var(--red)] cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
