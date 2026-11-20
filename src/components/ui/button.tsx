import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type ButtonVariant = "primary" | "secondary" | "secondaryLight" | "ghost" | "cyan" | "danger";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--red)] text-[var(--btn-action-text)] font-bold hover:brightness-110 active:bg-[var(--red-pressed)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--black)]",
  cyan:
    "bg-[var(--cyan)] text-[var(--btn-action-text)] font-extrabold hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--black)]",
  secondary:
    "bg-transparent border-2 border-[var(--cyan)]/70 text-[var(--cyan)] font-semibold hover:border-[var(--cyan)] hover:bg-[var(--cyan)]/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--black)]",
  secondaryLight:
    "bg-transparent border-2 border-white/80 text-white font-semibold hover:border-[#00E5FF] hover:text-[#00E5FF] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#00E5FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0B]",
  ghost:
    "bg-transparent text-[var(--white)] font-medium hover:text-[var(--cyan)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--black)]",
  danger:
    "bg-transparent border border-[var(--red)]/70 text-[var(--red)] font-semibold hover:bg-[var(--red)] hover:text-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--red)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--black)]",
};

const BASE_CLASSES =
  "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[2px] px-5 py-2.5 text-sm tracking-wide transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none";

export function Button({
  type = "button",
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
      type={type}
      className={twMerge(BASE_CLASSES, VARIANT_CLASSES[variant], className)}
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
  const isNativeLink =
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("tel:") ||
    href.startsWith("mailto:") ||
    href.startsWith("/api/") ||
    Boolean(props.download);

  const classes = twMerge(BASE_CLASSES, VARIANT_CLASSES[variant], className);

  if (isNativeLink) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...props}>
      {children}
    </Link>
  );
}
