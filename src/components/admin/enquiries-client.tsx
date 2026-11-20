"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShotCaption } from "@/components/ui/viewfinder";
import { formatAccraDateTime } from "@/lib/dates";
import {
  enquiryStatusValues,
  type EnquiryRecord,
  type EnquiryStatus,
} from "@/modules/content-legal/schema";

export function EnquiriesClient({ initialItems }: { initialItems: EnquiryRecord[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const visibleItems =
    statusFilter === "all" ? items : items.filter((item) => item.status === statusFilter);

  async function updateStatus(id: string, status: EnquiryStatus) {
    setBusyId(id);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/enquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { detail?: string } | null)?.detail ?? "Could not update enquiry status.");
        return;
      }
      if (!data) {
        setError("Unexpected empty response while updating enquiry.");
        return;
      }
      const updated = data as EnquiryRecord;
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
      setSuccess(`Enquiry from ${updated.name} marked as ${updated.status}.`);
      router.refresh();
    } catch {
      setError("Network error updating enquiry status.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <ShotCaption parts={["BOOKINGS DESK", "CONTACT INBOX", `${items.length} MESSAGES`]} />
        <h1 className="mt-2 font-display text-3xl font-extrabold">General enquiries</h1>
        <p className="mt-1 text-sm text-[var(--grey)]">
          Messages submitted through /contact. Privacy consent versions are logged per Ghana Data Protection Act requirements.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", ...enquiryStatusValues] as const).map((s) => {
          const active = statusFilter === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`min-h-[44px] border px-4 text-xs font-mono-meta uppercase tracking-wider cursor-pointer ${
                active
                  ? "border-[var(--cyan)] bg-[var(--ink-2)] text-[var(--cyan)]"
                  : "border-[var(--control-border)] text-[var(--white)] hover:border-[var(--cyan)]"
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>

      {error && (
        <div role="alert" className="border border-[var(--red)] bg-[var(--ink-2)] p-3 text-sm text-[var(--red)]">
          {error}
        </div>
      )}

      {success && (
        <div role="status" className="border border-[var(--cyan)] bg-[var(--ink-2)] p-3 text-sm text-[var(--cyan)]">
          {success}
        </div>
      )}

      {visibleItems.length === 0 ? (
        <div className="border border-[var(--hairline)] bg-[var(--ink-2)] p-8 text-sm text-[var(--grey)]">
          No enquiries in this status queue.
        </div>
      ) : (
        <div className="space-y-4">
          {visibleItems.map((item) => (
            <article
              key={item.id}
              className="space-y-3 border border-[var(--hairline)] bg-[var(--ink-2)] p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--hairline)] pb-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-[var(--white)]">
                    {item.name}
                  </h2>
                  <p className="font-mono-meta text-xs text-[var(--grey)]">
                    {item.email}
                    {item.phone ? ` · ${item.phone}` : ""} · Received {formatAccraDateTime(item.created_at)} · Privacy v{item.privacy_version}
                  </p>
                </div>
                <span className="font-mono-meta text-xs uppercase text-[var(--cyan)]">
                  {item.status}
                </span>
              </div>

              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--white)]">
                {item.message}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                {enquiryStatusValues
                  .filter((st) => st !== item.status)
                  .map((nextStatus) => (
                    <button
                      key={nextStatus}
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => updateStatus(item.id, nextStatus)}
                      className="min-h-[44px] border border-[var(--control-border)] px-3 text-xs font-mono-meta uppercase tracking-wider text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)] disabled:opacity-50 cursor-pointer"
                    >
                      Mark {nextStatus}
                    </button>
                  ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
