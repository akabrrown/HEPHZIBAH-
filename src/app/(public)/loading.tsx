export default function PublicLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6" role="status" aria-label="Loading page content">
      <div className="space-y-6">
        <div className="h-4 w-32 rounded-[2px] bg-[var(--ink-3)]" />
        <div className="h-12 w-2/3 rounded-[2px] bg-[var(--ink-3)]" />
        <div className="grid gap-6 pt-4 md:grid-cols-3">
          <div className="h-64 rounded-[2px] border border-[var(--hairline)] bg-[var(--ink-2)]" />
          <div className="h-64 rounded-[2px] border border-[var(--hairline)] bg-[var(--ink-2)]" />
          <div className="h-64 rounded-[2px] border border-[var(--hairline)] bg-[var(--ink-2)]" />
        </div>
      </div>
    </div>
  );
}
