import { ReactNode } from "react";

interface PageHeadingProps {
  title: string;
  ghostTitle?: string;
  eyebrow?: string;
  description?: ReactNode;
  lightMode?: boolean;
  onDark?: boolean;
  align?: "left" | "center";
  className?: string;
}

/**
 * PageHeading
 * Dual-layer cinematic display typography (Classica) with studio viewfinder framing:
 * - Clean editorial presentation
 * - Deep muted ghost watermark behind (aria-hidden, non-blocking)
 * - Solid foreground <h1> in Classica font with balanced sizing to prevent overcrowding
 */
export function PageHeading({
  title,
  ghostTitle,
  eyebrow,
  description,
  lightMode = false,
  onDark = false,
  align = "left",
  className = "",
}: PageHeadingProps) {
  const ghost = (ghostTitle || title).toUpperCase();
  const display = title.toUpperCase();

  return (
    <div
      className={`page-heading-container hm-fade-in-up ${onDark ? "page-heading-ondark" : ""} ${
        align === "center" ? "text-center mx-auto" : "text-left"
      } ${className}`}
    >
      {eyebrow && (
        <div
          className={`mb-2.5 flex items-center gap-2 text-xs font-mono tracking-widest uppercase ${
            lightMode ? "text-[var(--cyan-on-light)]" : "text-[var(--cyan)]"
          } ${align === "center" ? "justify-center" : "justify-start"}`}
        >
          <span>{eyebrow}</span>
        </div>
      )}

      <div className="relative inline-block max-w-full">
        {/* Ghost background watermark text */}
        <div
          aria-hidden="true"
          className={`page-heading-ghost ${align === "center" ? "page-heading-ghost-center" : ""}`}
        >
          {ghost}
        </div>

        {/* Foreground primary h1 title */}
        <h1 className="page-heading-foreground">
          {display}
        </h1>
      </div>

      {description && (
        <p className="mt-3.5 max-w-2xl text-base sm:text-lg leading-relaxed text-[var(--grey)]">
          {description}
        </p>
      )}
    </div>
  );
}
