import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

export function FormField({
  id,
  label,
  required = false,
  helpText,
  error,
  light = false,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  helpText?: string;
  error?: string;
  light?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-[var(--white)]"
      >
        {label}
        {required ? (
          <span
            className="ml-1 font-mono-meta text-xs text-[var(--red)]"
          >
            *
          </span>
        ) : (
          <span className="ml-2 text-xs font-normal text-[var(--grey)]">Optional</span>
        )}
      </label>
      {children}
      {helpText && !error && (
        <p id={`${id}-help`} className="text-xs text-[var(--grey)]">
          {helpText}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className={`flex items-center gap-1.5 text-xs font-medium ${
            light ? "text-[var(--red-on-light)]" : "text-[var(--red)]"
          }`}
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export const INPUT_CLASSES =
  "w-full min-h-[48px] rounded-[2px] bg-[var(--ink-2)] border-2 border-[var(--control-border)] hover:border-[var(--cyan)]/50 px-3.5 py-2.5 text-sm text-[var(--white)] placeholder:text-[var(--grey)] focus:outline-none focus:border-[var(--cyan)] focus:ring-[3px] focus:ring-[var(--cyan)]/35 transition-colors";

export const SELECT_CLASSES =
  "w-full min-h-[48px] rounded-[2px] bg-[var(--ink-2)] border-2 border-[var(--control-border)] hover:border-[var(--cyan)]/50 px-3.5 py-2.5 text-sm text-[var(--white)] focus:outline-none focus:border-[var(--cyan)] focus:ring-[3px] focus:ring-[var(--cyan)]/35 transition-colors";

export const TEXTAREA_CLASSES =
  "w-full rounded-[2px] bg-[var(--ink-2)] border-2 border-[var(--control-border)] hover:border-[var(--cyan)]/50 px-3.5 py-3 text-sm text-[var(--white)] placeholder:text-[var(--grey)] focus:outline-none focus:border-[var(--cyan)] focus:ring-[3px] focus:ring-[var(--cyan)]/35 transition-colors";
