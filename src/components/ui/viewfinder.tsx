import type { ReactNode } from "react";

export function FramingCorners({
  children,
  active = false,
  className = "",
}: {
  children: ReactNode;
  active?: boolean;
  className?: string;
}) {
  return (
    <div className={`vf-frame ${className}`} data-active={active ? "true" : "false"}>
      <span className="vf-corner vf-corner-tl" aria-hidden="true" />
      <span className="vf-corner vf-corner-tr" aria-hidden="true" />
      <span className="vf-corner vf-corner-bl" aria-hidden="true" />
      <span className="vf-corner vf-corner-br" aria-hidden="true" />
      {children}
    </div>
  );
}

export function RecDot({ label = "REC" }: { label?: string }) {
  return (
    <span className="font-mono-meta text-xs font-bold uppercase tracking-widest text-[var(--white)]">
      {label}
    </span>
  );
}

export function ShotCaption({
  parts,
  className = "",
}: {
  parts: Array<string | null | undefined>;
  className?: string;
}) {
  const cleaned = parts.filter((p): p is string => Boolean(p && p.trim().length > 0));
  if (cleaned.length === 0) return null;
  return (
    <p
      className={`font-mono-meta text-xs uppercase tracking-[0.12em] text-[var(--grey)] ${className}`}
    >
      {cleaned.join(" / ")}
    </p>
  );
}
