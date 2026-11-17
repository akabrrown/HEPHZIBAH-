"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { buildWhatsAppUrl } from "@/lib/dates";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toIsoDate(year: number, monthZeroBased: number, day: number): string {
  const d = new Date(Date.UTC(year, monthZeroBased, day));
  return d.toISOString().slice(0, 10);
}

function addMonths(year: number, monthZeroBased: number, delta: number): { year: number; month: number } {
  const d = new Date(Date.UTC(year, monthZeroBased + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

function getMonthLabel(year: number, monthZeroBased: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, monthZeroBased, 1)));
}

export function DatePicker({
  id,
  value,
  onChange,
  unavailableDates,
  earliestDate,
  latestDate,
  todayIso,
  minLeadDays,
  whatsappE164,
  loading = false,
  availabilityError = false,
  label = "Choose a date",
}: {
  id: string;
  value: string;
  onChange: (isoDate: string) => void;
  unavailableDates: string[];
  earliestDate: string;
  latestDate: string;
  todayIso: string;
  minLeadDays: number;
  whatsappE164: string;
  loading?: boolean;
  availabilityError?: boolean;
  label?: string;
}) {
  const initialDate = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : earliestDate;
  const [viewYear, setViewYear] = useState<number>(() => Number(initialDate.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState<number>(() => Number(initialDate.slice(5, 7)) - 1);
  const gridRef = useRef<HTMLDivElement>(null);

  const unavailableSet = useMemo(() => new Set(unavailableDates), [unavailableDates]);

  const cells = useMemo(() => {
    const firstDayUtc = new Date(Date.UTC(viewYear, viewMonth, 1));
    const dayOfWeek = firstDayUtc.getUTCDay(); // 0=Sun..6=Sat
    const mondayStartOffset = (dayOfWeek + 6) % 7;
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();

    const list: Array<{ iso: string; day: number; inMonth: boolean }> = [];
    for (let i = 0; i < mondayStartOffset; i++) {
      list.push({ iso: `pad-start-${i}`, day: 0, inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      list.push({ iso: toIsoDate(viewYear, viewMonth, d), day: d, inMonth: true });
    }
    return list;
  }, [viewYear, viewMonth]);

  const rushWhatsAppUrl = buildWhatsAppUrl(
    whatsappE164,
    `Hello Hephzibah Media, I need to check availability for an urgent date within ${minLeadDays} days.`
  );

  function moveFocusByDays(currentIso: string, deltaDays: number) {
    const parts = currentIso.split("-").map(Number);
    const next = new Date(Date.UTC(parts[0] ?? 2026, (parts[1] ?? 1) - 1, (parts[2] ?? 1) + deltaDays));
    const nextIso = next.toISOString().slice(0, 10);
    setViewYear(next.getUTCFullYear());
    setViewMonth(next.getUTCMonth());
    requestAnimationFrame(() => {
      const btn = gridRef.current?.querySelector<HTMLButtonElement>(`[data-iso="${nextIso}"]`);
      btn?.focus();
    });
  }

  return (
    <div id={id} className="rounded-[2px] border border-[var(--hairline)] bg-[var(--ink-2)] p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <p className="font-mono-meta text-xs uppercase tracking-[0.12em] text-[var(--grey)]">
            {label}
          </p>
          <p className="font-display text-lg font-bold text-[var(--white)]">
            {getMonthLabel(viewYear, viewMonth)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => {
              const prev = addMonths(viewYear, viewMonth, -1);
              setViewYear(prev.year);
              setViewMonth(prev.month);
            }}
            className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-[2px] border-2 border-[var(--control-border)] text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => {
              const next = addMonths(viewYear, viewMonth, 1);
              setViewYear(next.year);
              setViewMonth(next.month);
            }}
            className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-[2px] border-2 border-[var(--control-border)] text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] cursor-pointer"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {loading && (
        <p className="mb-3 font-mono-meta text-xs text-[var(--grey)]" role="status">
          Checking studio availability...
        </p>
      )}

      {availabilityError && (
        <p className="mb-3 rounded-[2px] border border-[var(--control-border)] bg-[var(--black)] p-2.5 text-xs text-[var(--grey)]">
          Availability calendar could not be reached right now. Pick any date after the lead time and our desk will verify it on submit.
        </p>
      )}

      <div
        ref={gridRef}
        role="grid"
        aria-label={getMonthLabel(viewYear, viewMonth)}
        className="grid grid-cols-7 gap-1"
      >
        {WEEKDAYS.map((wd) => (
          <div
            key={wd}
            role="columnheader"
            className="py-1.5 text-center font-mono-meta text-xs uppercase text-[var(--grey)]"
          >
            {wd}
          </div>
        ))}

        {cells.map((cell) => {
          if (!cell.inMonth) {
            return <div key={cell.iso} className="min-h-[44px]" aria-hidden="true" />;
          }

          const isBeforeLead = cell.iso < earliestDate;
          const isAfterMax = cell.iso > latestDate;
          const isBooked = unavailableSet.has(cell.iso);
          const isDisabled = isBeforeLead || isAfterMax || isBooked;
          const isSelected = value === cell.iso;
          const isToday = cell.iso === todayIso;

          const statusWord = isBooked
            ? "unavailable"
            : isBeforeLead
              ? "inside lead time, unavailable"
              : isAfterMax
                ? "outside booking window"
                : isSelected
                  ? "selected"
                  : "available";

          return (
            <button
              key={cell.iso}
              type="button"
              data-iso={cell.iso}
              aria-label={`${cell.iso}, ${statusWord}`}
              aria-disabled={isDisabled ? "true" : "false"}
              aria-pressed={isSelected}
              onClick={() => {
                if (!isDisabled) {
                  onChange(cell.iso);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  moveFocusByDays(cell.iso, 1);
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  moveFocusByDays(cell.iso, -1);
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  moveFocusByDays(cell.iso, 7);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  moveFocusByDays(cell.iso, -7);
                }
              }}
              className={`relative flex min-h-[44px] w-full flex-col items-center justify-center rounded-[2px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] ${
                isSelected
                  ? "border-2 border-[var(--cyan)] bg-[var(--cyan)]/15 font-bold text-[var(--white)]"
                  : isBooked
                    ? "date-unavailable-hatch border border-[var(--hairline)] text-[var(--grey)]/60 line-through cursor-not-allowed"
                    : isBeforeLead || isAfterMax
                      ? "border border-transparent text-[var(--grey)]/40 cursor-not-allowed"
                      : "border border-[var(--hairline)] bg-[var(--black)] text-[var(--white)] hover:border-[var(--cyan)] cursor-pointer"
              }`}
            >
              <span>{cell.day}</span>
              {isToday && (
                <span
                  aria-hidden="true"
                  className="mt-0.5 h-[2px] w-4 bg-[var(--cyan)]"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--hairline)] pt-3 text-xs text-[var(--grey)]">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3.5 w-3.5 border border-[var(--cyan)] bg-[var(--cyan)]/20" />
            Selected
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="date-unavailable-hatch inline-block h-3.5 w-3.5 border border-[var(--hairline)]" />
            Booked / Unavailable
          </span>
        </div>
        <p>
          Online bookings require at least {minLeadDays} days&apos; notice.{" "}
          <a
            href={rushWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--cyan)] underline underline-offset-4"
          >
            Message us on WhatsApp for urgent dates
          </a>
          .
        </p>
      </div>
    </div>
  );
}
