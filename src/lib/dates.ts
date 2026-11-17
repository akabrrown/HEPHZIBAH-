export const ACCRA_TIMEZONE = "Africa/Accra";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function getAccraTodayIso(now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ACCRA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

export function addDaysIso(isoDate: string, days: number): string {
  if (!ISO_DATE_RE.test(isoDate)) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }
  const parts = isoDate.split("-").map(Number);
  const year = parts[0] ?? 2026;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

export function diffDaysIso(fromIso: string, toIso: string): number {
  if (!ISO_DATE_RE.test(fromIso) || !ISO_DATE_RE.test(toIso)) {
    throw new Error("Invalid ISO date range");
  }
  const a = Date.parse(`${fromIso}T00:00:00Z`);
  const b = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

export function getEarliestSelectableDate(minLeadDays: number, now: Date = new Date()): string {
  return addDaysIso(getAccraTodayIso(now), minLeadDays);
}

export function getLatestSelectableDate(maxAdvanceDays: number, now: Date = new Date()): string {
  return addDaysIso(getAccraTodayIso(now), maxAdvanceDays);
}

export function formatDisplayDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "Not set";
  const datePart = isoDate.slice(0, 10);
  if (!ISO_DATE_RE.test(datePart)) return isoDate;
  const d = new Date(`${datePart}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ACCRA_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatAccraDateTime(isoTimestamp: string | null | undefined): string {
  if (!isoTimestamp) return "Not set";
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return isoTimestamp;
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: ACCRA_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${dateLabel} GMT`;
}

export function formatRelativeAgeHours(createdAtIso: string, now: Date = new Date()): string {
  const created = new Date(createdAtIso).getTime();
  if (Number.isNaN(created)) return "—";
  const diffMs = Math.max(0, now.getTime() - created);
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) {
    const mins = Math.max(1, Math.floor(diffMs / 60_000));
    return `${mins}m ago`;
  }
  if (hours < 48) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function normalizeGhanaPhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/[^\d+]/g, "");
  let normalized = "";
  if (digits.startsWith("+233")) {
    normalized = `+233${digits.slice(4).replace(/^0+/, "")}`;
  } else if (digits.startsWith("233") && digits.length >= 12) {
    normalized = `+233${digits.slice(3).replace(/^0+/, "")}`;
  } else if (digits.startsWith("0") && digits.length === 10) {
    normalized = `+233${digits.slice(1)}`;
  } else if (digits.startsWith("+") && digits.length >= 9 && digits.length <= 15) {
    normalized = digits;
  } else if (/^\d{9,15}$/.test(digits)) {
    normalized = `+${digits}`;
  } else {
    return null;
  }

  if (!/^\+?[0-9 ]{9,16}$/.test(normalized)) {
    return null;
  }
  return normalized;
}

export function buildWhatsAppUrl(phoneE164: string, message: string): string {
  const digits = phoneE164.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
