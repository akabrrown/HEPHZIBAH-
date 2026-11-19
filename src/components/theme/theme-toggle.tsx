"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({
  className = "",
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const current = document.documentElement.getAttribute("data-theme") as "dark" | "light" | null;
    if (current === "light" || current === "dark") {
      setTheme(current);
    } else {
      const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
      setTheme(prefersLight ? "light" : "dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    if (nextTheme === "light") {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
    try {
      localStorage.setItem("hephzibah-theme", nextTheme);
    } catch {
      // localStorage may fail in restricted/private contexts
    }
  };

  const isLight = theme === "light";

  if (!mounted) {
    // Avoid hydration layout shift
    return (
      <div
        className={`h-10 w-10 min-h-[44px] min-w-[44px] rounded-[2px] border border-[var(--hairline)] bg-[var(--ink-2)]/60 opacity-60 ${className}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isLight}
      aria-label={isLight ? "Switch to dark studio theme" : "Switch to light gallery theme"}
      title={isLight ? "Switch to Dark Theme" : "Switch to Light Theme"}
      className={`group relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-[2px] border border-[var(--control-border)] bg-[var(--ink-2)] px-3 py-2 text-xs font-mono font-bold tracking-wider text-[var(--white)] transition-colors hover:border-[var(--cyan)] hover:text-[var(--cyan)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan)] cursor-pointer ${className}`}
    >
      {isLight ? (
        <>
          <Moon className="h-4 w-4 shrink-0 text-[var(--cyan)] transition-transform group-hover:-rotate-12" aria-hidden="true" />
          {showLabel && <span className="uppercase">Dark Mode</span>}
        </>
      ) : (
        <>
          <Sun className="h-4 w-4 shrink-0 text-[var(--cyan)] transition-transform group-hover:rotate-45" aria-hidden="true" />
          {showLabel && <span className="uppercase">Light Mode</span>}
        </>
      )}
    </button>
  );
}
