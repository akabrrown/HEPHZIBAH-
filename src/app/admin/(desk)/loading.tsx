export default function AdminDeskLoading() {
  return (
    <div className="space-y-6 p-4 sm:p-6" role="status" aria-label="Loading admin desk">
      <div className="h-8 w-56 rounded-[2px] bg-[var(--ink-3)]" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-28 rounded-[2px] border border-[var(--hairline)] bg-[var(--ink-2)]" />
        <div className="h-28 rounded-[2px] border border-[var(--hairline)] bg-[var(--ink-2)]" />
        <div className="h-28 rounded-[2px] border border-[var(--hairline)] bg-[var(--ink-2)]" />
      </div>
      <div className="h-64 rounded-[2px] border border-[var(--hairline)] bg-[var(--ink-2)]" />
    </div>
  );
}
