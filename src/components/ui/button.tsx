import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "secondaryLight" | "ghost" | "cyan";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--red)] text-[var(--btn-action-text)] font-bold hover:brightness-110 active:bg-[var(--red-pressed)] hover:shadow-[0_6px_22px_rgba(255,31,46,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--black)]",
  cyan:
    "bg-[var(--cyan)] text-[var(--btn-action-text)] font-extrabold hover:brightness-110 hover:shadow-[0_6px_25px_rgba(0,229,255,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--black)]",
  secondary:
    "bg-transparent border-2 border-[var(--cyan)]/70 text-[var(--cyan)] font-semibold hover:border-[var(--cyan)] hover:bg-[var(--cyan)]/10 hover:shadow-[0_6px_22px_rgba(0,229,255,0.22)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--black)]",
  secondaryLight:
    "bg-transparent border-2 border-[var(--white)] text-[var(--white)] font-semibold hover:border-[var(--cyan)] hover:text-[var(--cyan)] hover:shadow-[0_4px_18px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2",
  ghost:
    "bg-transparent text-[var(--white)] font-medium hover:text-[var(--cyan)] hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--black)]",
};

const BASE_CLASSES =
  "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[2px] px-5 py-2.5 text-sm tracking-wide transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none";

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
}) {
  return (
    <button
      className={`${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: ButtonVariant;
  children: ReactNode;
}) {
  const isExternal = href.startsWith("http://") || href.startsWith("https://") || href.startsWith("tel:");
  if (isExternal) {
    return (
      <a
        href={href}
        className={`${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className}`}
        {...props}
      >
        {children}
      </a>
    );
  }
  return (
    <Link
      href={href}
      className={`${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}
