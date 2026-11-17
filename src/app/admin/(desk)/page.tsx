import Link from "next/link";
import { RetryOutboxButton } from "@/components/admin/retry-outbox-button";
import { ShotCaption } from "@/components/ui/viewfinder";
import { requireAdmin } from "@/lib/auth";
import { formatAccraDateTime, formatDisplayDate, formatRelativeAgeHours } from "@/lib/dates";
import { formatGhsFromMinor } from "@/lib/money";
import { getAdminDashboardSummary } from "@/modules/admin/service";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const data = await getAdminDashboardSummary(admin);
  const canBookings = admin.scopes.includes("bookings");

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--hairline)] pb-5">
        <div>
          <ShotCaption parts={["ADMIN DASHBOARD", `SCOPES: ${admin.scopes.join(", ")}`]} />
          <h1 className="mt-1 font-display text-3xl font-extrabold">Today&apos;s triage</h1>
        </div>
        {canBookings && data.medianFirstResponseHours !== null && (
          <div className="border border-[var(--hairline)] bg-[var(--ink-2)] px-4 py-2.5 text-right">
            <p className="font-mono-meta text-xs uppercase text-[var(--grey)]">
              Median first response
            </p>
            <p className="font-display text-xl font-bold text-[var(--cyan)]">
              {data.medianFirstResponseHours} hrs
            </p>
          </div>
        )}
      </header>

      {canBookings ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Needs a reply */}
          <section className="border border-[var(--hairline)] bg-[var(--ink-2)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">
                Needs a reply ({data.needsReply.length})
              </h2>
              <Link href="/admin/bookings?status=new" className="text-xs text-[var(--cyan)] underline">
                Open inbox
              </Link>
            </div>
            {data.needsReply.length === 0 ? (
              <p className="text-sm text-[var(--grey)]">Nothing waiting.</p>
            ) : (
              <ul className="divide-y divide-[var(--hairline)]">
                {data.needsReply.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/admin/bookings/${b.id}`}
                      className="flex min-h-[48px] items-center justify-between gap-3 py-2.5 text-sm hover:text-[var(--cyan)]"
                    >
                      <div>
                        <p className="font-semibold">
                          <span className="font-mono-meta text-xs text-[var(--cyan)] mr-2">
                            {b.reference}
                          </span>
                          {b.client_name}
                        </p>
                        <p className="text-xs text-[var(--grey)] capitalize">
                          {b.kind} · {formatDisplayDate(b.event_date ?? b.deadline)}
                        </p>
                      </div>
                      <span className="font-mono-meta text-xs text-[var(--grey)]">
                        {formatRelativeAgeHours(b.created_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Quotes waiting */}
          <section className="border border-[var(--hairline)] bg-[var(--ink-2)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">
                Quotes waiting ({data.quotesWaiting.length})
              </h2>
              <Link href="/admin/bookings?status=quoted" className="text-xs text-[var(--cyan)] underline">
                View all
              </Link>
            </div>
            {data.quotesWaiting.length === 0 ? (
              <p className="text-sm text-[var(--grey)]">No pending quotes.</p>
            ) : (
              <ul className="divide-y divide-[var(--hairline)]">
                {data.quotesWaiting.map((q) => (
                  <li key={q.id}>
                    <Link
                      href={`/admin/bookings/${q.id}`}
                      className="flex min-h-[48px] items-center justify-between gap-3 py-2.5 text-sm hover:text-[var(--cyan)]"
                    >
                      <div>
                        <p className="font-semibold">
                          <span className="font-mono-meta text-xs text-[var(--cyan)] mr-2">
                            {q.reference}
                          </span>
                          {q.client_name}
                        </p>
                        <p className="text-xs text-[var(--grey)]">
                          {formatGhsFromMinor(q.total_minor)}
                        </p>
                      </div>
                      <span className="font-mono-meta text-xs text-[var(--grey)]">
                        Expires {formatDisplayDate(q.valid_until)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Deposits awaited */}
          <section className="border border-[var(--hairline)] bg-[var(--ink-2)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">
                Deposits awaited ({data.depositsAwaited.length})
              </h2>
              <Link href="/admin/bookings?status=accepted" className="text-xs text-[var(--cyan)] underline">
                View accepted
              </Link>
            </div>
            {data.depositsAwaited.length === 0 ? (
              <p className="text-sm text-[var(--grey)]">No accepted bookings awaiting deposit.</p>
            ) : (
              <ul className="divide-y divide-[var(--hairline)]">
                {data.depositsAwaited.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/admin/bookings/${d.id}`}
                      className="flex min-h-[48px] items-center justify-between gap-3 py-2.5 text-sm hover:text-[var(--cyan)]"
                    >
                      <div>
                        <p className="font-semibold">
                          <span className="font-mono-meta text-xs text-[var(--cyan)] mr-2">
                            {d.reference}
                          </span>
                          {d.client_name}
                        </p>
                        <p className="text-xs text-[var(--grey)]">
                          Deposit due: {formatGhsFromMinor(d.deposit_minor)}
                        </p>
                      </div>
                      <span className="font-mono-meta text-xs text-[var(--grey)]">
                        {formatDisplayDate(d.event_date)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* This week confirmed */}
          <section className="border border-[var(--hairline)] bg-[var(--ink-2)] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">
                This week&apos;s confirmed shoots ({data.thisWeek.length})
              </h2>
              <Link href="/admin/calendar" className="text-xs text-[var(--cyan)] underline">
                Open calendar
              </Link>
            </div>
            {data.thisWeek.length === 0 ? (
              <p className="text-sm text-[var(--grey)]">No confirmed shoots in the next seven days.</p>
            ) : (
              <ul className="divide-y divide-[var(--hairline)]">
                {data.thisWeek.map((w) => (
                  <li key={w.id}>
                    <Link
                      href={`/admin/bookings/${w.id}`}
                      className="flex min-h-[48px] items-center justify-between gap-3 py-2.5 text-sm hover:text-[var(--cyan)]"
                    >
                      <div>
                        <p className="font-semibold">
                          <span className="font-mono-meta text-xs text-[var(--cyan)] mr-2">
                            {w.reference}
                          </span>
                          {w.client_name}
                        </p>
                        <p className="text-xs text-[var(--grey)]">
                          {w.venue_text ?? w.venue_city ?? "Venue TBD"}
                        </p>
                      </div>
                      <span className="font-mono-meta text-xs text-[var(--grey)]">
                        {formatAccraDateTime(w.starts_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <div className="border border-[var(--hairline)] bg-[var(--ink-2)] p-6 text-sm text-[var(--grey)]">
          Use the navigation bar above to manage the sections assigned to your account ({admin.scopes.join(", ")}).
        </div>
      )}

      {/* Email outbox problems */}
      {canBookings && (
        <section className="border border-[var(--hairline)] bg-[var(--ink-2)] p-5 space-y-4">
          <h2 className="font-display text-lg font-bold">
            Email delivery issues ({data.emailProblems.length})
          </h2>
          {data.emailProblems.length === 0 ? (
            <p className="text-sm text-[var(--grey)]">All queued emails delivered cleanly.</p>
          ) : (
            <ul className="divide-y divide-[var(--hairline)]">
              {data.emailProblems.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium">
                      <span className="font-mono-meta text-xs uppercase text-[var(--red)] mr-2">
                        {e.status}
                      </span>
                      {e.template} &rarr; {e.to_email}
                    </p>
                    {e.last_error && (
                      <p className="text-xs text-[var(--grey)]">{e.last_error}</p>
                    )}
                  </div>
                  <RetryOutboxButton outboxId={e.id} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
