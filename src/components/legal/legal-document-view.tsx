import { Fragment } from "react";
import { PageHeading } from "@/components/ui/page-heading";
import { formatDisplayDate } from "@/lib/dates";
import type { LegalDocumentRecord } from "@/modules/content-legal/schema";

function renderInlineBold(text: string) {
  const segments = text.split(/(\*\*[^*]+\*\*)/g);
  return segments.map((seg, i) => {
    if (seg.startsWith("**") && seg.endsWith("**") && seg.length > 4) {
      return (
        <strong key={i} className="font-semibold text-[var(--white)]">
          {seg.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={i}>{seg}</Fragment>;
  });
}

export function LegalDocumentView({
  current,
  history,
}: {
  current: LegalDocumentRecord | null;
  history: LegalDocumentRecord[];
}) {
  if (!current) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-bold">Policy unavailable</h1>
        <p className="mt-3 text-sm text-[var(--grey)]">
          This document has not been published yet.
        </p>
      </div>
    );
  }

  const blocks = current.body_md.split(/\n\n+/);

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 space-y-8">
      <header className="border-b border-[var(--hairline)] pb-6 space-y-4">
        <PageHeading
          title={current.title}
        />
        {current.summary_of_changes && (
          <p className="text-sm text-[var(--grey)]">{current.summary_of_changes}</p>
        )}
      </header>

      <div className="space-y-5 text-base leading-relaxed text-[var(--grey)]">
        {blocks.map((block, idx) => {
          const trimmed = block.trim();
          if (trimmed.startsWith("## ")) {
            const lines = trimmed.split("\n");
            const heading = lines[0]!.slice(3);
            const rest = lines.slice(1).join("\n").trim();
            return (
              <section key={idx} className="space-y-3 pt-2">
                <h2 className="font-display text-xl font-bold text-[var(--white)]">
                  {heading}
                </h2>
                {rest && <p>{renderInlineBold(rest)}</p>}
              </section>
            );
          }
          if (trimmed.startsWith("- ")) {
            const items = trimmed
              .split("\n")
              .map((line) => line.replace(/^- /, "").trim())
              .filter(Boolean);
            return (
              <ul key={idx} className="list-disc space-y-2 pl-5">
                {items.map((item, j) => (
                  <li key={j}>{renderInlineBold(item)}</li>
                ))}
              </ul>
            );
          }
          return <p key={idx}>{renderInlineBold(trimmed)}</p>;
        })}
      </div>

      {history.length > 1 && (
        <section className="border-t border-[var(--hairline)] pt-6">
          <h2 className="font-display text-base font-bold text-[var(--white)]">
            Published version history
          </h2>
          <ul className="mt-3 space-y-1.5 text-xs font-mono-meta text-[var(--grey)]">
            {history.map((h) => (
              <li key={h.id}>
                v{h.version} · {formatDisplayDate(h.effective_at)}
                {h.summary_of_changes ? ` — ${h.summary_of_changes}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
