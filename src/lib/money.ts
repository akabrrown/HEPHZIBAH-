export function formatGhsFromMinor(minor: number, currency = "GHS"): string {
  const major = minor / 100;
  const hasFraction = minor % 100 !== 0;
  const formattedNumber = new Intl.NumberFormat("en-GH", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(major);
  return `${currency.trim()} ${formattedNumber}`;
}

export function toMinorUnits(majorAmount: number): number {
  if (!Number.isFinite(majorAmount) || majorAmount < 0) {
    throw new Error("Amount must be a non-negative finite number");
  }
  return Math.round(majorAmount * 100);
}

export function fromMinorUnits(minor: number): number {
  return Number((minor / 100).toFixed(2));
}
