"use client";

import { Download, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { INPUT_CLASSES, SELECT_CLASSES } from "@/components/ui/form-field";
import { formatDisplayDate } from "@/lib/dates";
import { bookingStatusValues, type BookingRecord } from "@/modules/booking/schema";
import { serviceKindValues } from "@/modules/catalog/schema";

const STATUS_BADGES: Record<string, { label: string; marker: string }> = {
  new: { label: "New", marker: "●" },
  reviewing: { label: "Reviewing", marker: "◐" },
  quoted: { label: "Quoted", marker: "◇" },
  accepted: { label: "Accepted", marker: "◆" },
  confirmed: { label: "Confirmed", marker: "■" },
  completed: { label: "Completed", marker: "✓" },
  declined: { label: "Declined", marker: "×" },
  cancelled: { label: "Cancelled", marker: "—" },
  expired: { label: "Expired", marker: "⌛" },
};

export function BookingsListClient({
  items,
  initialNextCursor = null,
  initialFilters,
}: {
  items: BookingRecord[];
  initialNextCursor?: string | null;
  initialFilters: { status: string; kind: string; q: string; from: string; to: string };
}) {
  const router = useRouter();
  const [rows, setRows] = useState<BookingRecord[]>(items);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [status, setStatus] = useState(initialFilters.status);
  const [kind, setKind] = useState(initialFilters.kind);
  const [q, setQ] = useState(initialFilters.q);
  const [from, setFrom] = useState(initialFilters.from);
  const [to, setTo] = useState(initialFilters.to);

  useEffect(() => {
    setRows(items);
    setNextCursor(initialNextCursor ?? null);
    setStatus(initialFilters.status);
    setKind(initialFilters.kind);
    setQ(initialFilters.q);
    setFrom(initialFilters.from);
    setTo(initialFilters.to);
  }, [items, initialNextCursor, initialFilters]);

  function buildQueryString() {
    const sp = new URLSearchParams();
    if (status) sp.set("status", status);
    if (kind) sp.set("kind", kind);
    if (q.trim()) sp.set("q", q.trim());
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    return sp.toString();
  }

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    const qs = buildQueryString();
    router.push(qs ? `/admin/bookings?${qs}` : "/admin/bookings");
  }

  function clearFilters() {
    setStatus("");
    setKind("");
    setQ("");
    setFrom("");
    setTo("");
    router.push("/admin/bookings");
  }

  async function handleLoadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setLoadError(null);
    try {
      const qs = buildQueryString();
      const url = `/api/admin/bookings?${qs ? `${qs}&` : ""}cursor=${encodeURIComponent(nextCursor)}`;
      const res = await fetch(url);
      const data = (await res.json().catch(() => null)) as {
        items?: BookingRecord[];
        nextCursor?: string | null;
        detail?: string;
      } | null;
      if (!res.ok || !data) {
        setLoadError(data?.detail ?? "Could not load more bookings.");
        return;
      }
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        const added = (data.items ?? []).filter((r) => !seen.has(r.id));
        return [...prev, ...added];
      });
      setNextCursor(data.nextCursor ?? null);
    } catch {
      setLoadError("Network error while loading more bookings.");
    } finally {
      setLoadingMore(false);
    }
  }

  const hasActiveFilters = Boolean(status || kind || q.trim() || from || to);

  const csvQs = buildQueryString();
  const csvHref = csvQs ? `/api/admin/bookings?${csvQs}&format=csv` : "/api/admin/bookings?format=csv";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Bookings &amp; requests</h1>
          <p className="mt-1 text-sm text-[var(--grey)]">
            Search by reference, client name, email, or last four digits of phone number.
          </p>
        </div>
        <ButtonLink href={csvHref} variant="secondary" download="hephzibah-bookings.csv">
          <Download className="h-4 w-4" aria-hidden="true" />
          <span>Export CSV</span>
        </ButtonLink>
      </div>

      <form
        onSubmit={applyFilters}
        className="grid gap-3 border border-[var(--hairline)] bg-[var(--ink-2)] p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <div className="lg:col-span-2">
          <label htmlFor="filter-q" className="mb-1 block text-xs text-[var(--grey)]">
            Search
          </label>
          <div className="relative">
            <input
              id="filter-q"
              type="text"
              className={INPUT_CLASSES}
              placeholder="HM-2611-..., name, or last 4 phone digits"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="filter-status" className="mb-1 block text-xs text-[var(--grey)]">
            Status
          </label>
          <select
            id="filter-status"
            className={SELECT_CLASSES}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {bookingStatusValues.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-kind" className="mb-1 block text-xs text-[var(--grey)]">
            Discipline
          </label>
          <select
            id="filter-kind"
            className={SELECT_CLASSES}
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="">All kinds</option>
            {serviceKindValues.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-from" className="mb-1 block text-xs text-[var(--grey)]">
            From date
          </label>
          <input
            id="filter-from"
            type="date"
            className={INPUT_CLASSES}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="filter-to" className="mb-1 block text-xs text-[var(--grey)]">
              To date
            </label>
            <input
              id="filter-to"
              type="date"
              className={INPUT_CLASSES}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <Button type="submit" variant="primary" aria-label="Apply booking filters" className="px-4">
            <Search className="h-4 w-4" aria-hidden="true" />
          </Button>
          {hasActiveFilters && (
            <Button type="button" variant="secondary" onClick={clearFilters} className="px-3 text-xs">
              Clear
            </Button>
          )}
        </div>
      </form>

      {loadError && (
        <div role="alert" className="border border-[var(--red)] bg-[var(--ink-2)] p-3 text-sm text-[var(--red)]">
          {loadError}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="border border-[var(--hairline)] bg-[var(--ink-2)] p-8 text-center text-sm text-[var(--grey)]">
          No bookings match those filters.
        </div>
      ) : (
        <>
          {/* Desktop table (>= md) with 44px rows */}
          <div className="hidden overflow-x-auto border border-[var(--hairline)] bg-[var(--ink-2)] md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 border-b border-[var(--hairline)] bg-[var(--black)] font-mono-meta text-xs uppercase text-[var(--grey)]">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Date / Deadline</th>
                  <th className="px-4 py-3">City</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hairline)]">
                {rows.map((b) => {
                  const badge = STATUS_BADGES[b.status] ?? { label: b.status, marker: "•" };
                  return (
                    <tr
                      key={b.id}
                      onClick={() => router.push(`/admin/bookings/${b.id}`)}
                      className="h-[44px] cursor-pointer hover:bg-[var(--black)]"
                    >
                      <td className="px-4 py-2.5 font-mono-meta text-xs text-[var(--cyan)]">
                        <Link href={`/admin/bookings/${b.id}`} onClick={(e) => e.stopPropagation()}>
                          {b.reference}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 font-mono-meta text-xs uppercase">
                        <span className="mr-1.5" aria-hidden="true">
                          {badge.marker}
                        </span>
                        {badge.label}
                      </td>
                      <td className="px-4 py-2.5 font-medium">{b.client_name}</td>
                      <td className="px-4 py-2.5 text-[var(--grey)]">
                        {b.service_name ?? b.kind}
                      </td>
                      <td className="px-4 py-2.5 font-mono-meta text-xs">
                        {formatDisplayDate(b.event_date ?? b.deadline)}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--grey)]">{b.venue_city ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card collapse (360px ready) */}
          <div className="space-y-3 md:hidden">
            {rows.map((b) => {
              const badge = STATUS_BADGES[b.status] ?? { label: b.status, marker: "•" };
              return (
                <Link
                  key={b.id}
                  href={`/admin/bookings/${b.id}`}
                  className="block border border-[var(--hairline)] bg-[var(--ink-2)] p-4 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono-meta text-xs text-[var(--cyan)]">
                      {b.reference}
                    </span>
                    <span className="font-mono-meta text-xs uppercase">
                      {badge.marker} {badge.label}
                    </span>
                  </div>
                  <p className="font-display text-base font-bold">{b.client_name}</p>
                  <p className="text-xs text-[var(--grey)]">
                    {b.service_name ?? b.kind} · {formatDisplayDate(b.event_date ?? b.deadline)}
                  </p>
                </Link>
              );
            })}
          </div>

          {nextCursor && (
            <div className="flex justify-center pt-2">
              <Button type="button" variant="secondary" disabled={loadingMore} onClick={handleLoadMore}>
                {loadingMore ? "Loading more..." : "Load more bookings"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
