"use client";

import { ArrowRight, Calendar, Camera, Film, Layers } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/ui/brand-logo";
import { FramingCorners, ShotCaption } from "@/components/ui/viewfinder";

const SPLASH_SEEN_KEY = "hm_welcome_splash_seen_v2";

export function WelcomeSplash({ businessName }: { businessName: string }) {
  // Start hidden on initial render to prevent SSR hydration flash, then check sessionStorage
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<"visible" | "exiting" | "hidden">("hidden");
  const exitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      if (sessionStorage.getItem(SPLASH_SEEN_KEY) === "1") {
        setPhase("hidden");
        return;
      }
    } catch {
      // Proceed cleanly without storage persistence
    }
    setPhase("visible");
  }, []);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  const dismiss = useCallback(() => {
    try {
      sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
    } catch {
      // Ignore storage access restrictions
    }
    setPhase("exiting");
    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current);
    }
    exitTimerRef.current = window.setTimeout(() => {
      setPhase("hidden");
    }, 450);
  }, []);

  useEffect(() => {
    if (phase !== "visible") return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [phase, dismiss]);

  // Lock body scroll while splash is active
  useEffect(() => {
    if (phase === "visible" || phase === "exiting") {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [phase]);

  if (!mounted || phase === "hidden") {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-splash-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
      className={`hm-splash-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md px-4 text-[var(--white)] transition-all duration-300 ${
        phase === "exiting" ? "hm-splash-exit opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      <div className="w-full max-w-xl max-h-[92dvh] overflow-y-auto rounded-[2px] shadow-2xl">
        <FramingCorners active className="border border-[var(--hairline)] bg-[var(--ink-2)] p-6 sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hairline)] pb-4">
            <ShotCaption parts={["HEPHZIBAH MEDIA", "ACCRA · GHANA", "STUDIO DESK"]} />
          </div>

          {/* Studio Brand & Tagline */}
          <div className="py-6 sm:py-8 space-y-4 text-center">
            <div className="flex justify-center pb-1">
              <BrandLogo variant="auto" size="xl" priority />
            </div>
            <p className="font-mono-meta text-xs uppercase tracking-[0.25em] text-[var(--cyan)] font-bold">
              Accra · Ghana · Visual Studio
            </p>
            <h2 id="welcome-splash-title" className="font-classica text-3xl font-extrabold tracking-tight text-[var(--white)] sm:text-5xl">
              {businessName}
            </h2>
            <p className="font-serif-display mx-auto max-w-md text-sm italic leading-relaxed text-[var(--grey)] sm:text-base">
              Every ceremony, film, and identity — framed to endure.
            </p>
          </div>

          {/* Interactive Discipline Quick-Select Links */}
          <div className="border-t border-[var(--hairline)] pt-4 pb-2">
            <p className="text-center font-mono-meta text-[11px] font-bold uppercase tracking-wider text-[var(--grey)] mb-3">
              Explore Our Disciplines
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Link
                href="/services/photography"
                onClick={dismiss}
                className="group flex flex-col items-center justify-center p-2.5 rounded-[2px] border border-[var(--hairline)] bg-[var(--black)] hover:border-[var(--cyan)] hover:bg-[var(--cyan)]/10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] transition-all cursor-pointer"
              >
                <Camera className="h-5 w-5 text-[var(--cyan)] group-hover:scale-110 transition-transform mb-1.5" aria-hidden="true" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--white)] group-hover:text-[var(--cyan)]">
                  Photo
                </span>
              </Link>
              <Link
                href="/services/videography"
                onClick={dismiss}
                className="group flex flex-col items-center justify-center p-2.5 rounded-[2px] border border-[var(--hairline)] bg-[var(--black)] hover:border-[var(--cyan)] hover:bg-[var(--cyan)]/10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] transition-all cursor-pointer"
              >
                <Film className="h-5 w-5 text-[var(--cyan)] group-hover:scale-110 transition-transform mb-1.5" aria-hidden="true" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--white)] group-hover:text-[var(--cyan)]">
                  Video
                </span>
              </Link>
              <Link
                href="/services/design"
                onClick={dismiss}
                className="group flex flex-col items-center justify-center p-2.5 rounded-[2px] border border-[var(--hairline)] bg-[var(--black)] hover:border-[var(--cyan)] hover:bg-[var(--cyan)]/10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] transition-all cursor-pointer"
              >
                <Layers className="h-5 w-5 text-[var(--cyan)] group-hover:scale-110 transition-transform mb-1.5" aria-hidden="true" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--white)] group-hover:text-[var(--cyan)]">
                  Design
                </span>
              </Link>
            </div>
          </div>

          {/* Action CTAs: Enter Studio + Book Directly */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[var(--hairline)] pt-5 mt-3">
            <Link
              href="/book"
              onClick={dismiss}
              className="w-full sm:w-auto inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[2px] border border-[var(--control-border)] bg-[var(--black)] px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] transition-colors"
            >
              <Calendar className="h-4 w-4" aria-hidden="true" />
              <span>Book Session</span>
            </Link>

            <button
              type="button"
              onClick={dismiss}
              className="w-full sm:w-auto font-display inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-[2px] border-2 border-[var(--cyan)] bg-[var(--cyan)] px-7 py-2.5 text-sm font-extrabold uppercase tracking-wider text-[var(--btn-action-text)] transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink-2)] cursor-pointer active:scale-95"
            >
              <span>Enter Studio</span>
              <ArrowRight className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
            </button>
          </div>
        </FramingCorners>
      </div>
    </div>
  );
}
