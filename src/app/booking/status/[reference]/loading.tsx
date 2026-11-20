export default function BookingStatusLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6" role="status" aria-label="Loading booking status">
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-[2px] bg-[var(--ink-3)]" />
        <div className="h-44 rounded-[2px] border border-[var(--hairline)] bg-[var(--ink-2)]" />
        <div className="h-36 rounded-[2px] border border-[var(--hairline)] bg-[var(--ink-2)]" />
      </div>
    </div>
  );
}
