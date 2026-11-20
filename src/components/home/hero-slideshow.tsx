"use client";

import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { resolveImageUrl } from "@/lib/media";
import type { HeroSlide } from "@/modules/hero-slides/schema";

const FALLBACK_SLIDE: HeroSlide = {
  id: "fallback-studio-hero",
  image_public_id: "/media/hephzibah-hero-bg.jpg",
  alt_text: "Hephzibah Media production team holding camera and lighting gear in Accra, Ghana",
  focal_x: 78,
  focal_y: 22,
  eyebrow_left: null,
  eyebrow_right: null,
  headline: null,
  subcopy: null,
  sort_order: 0,
  is_active: true,
  created_at: "",
  updated_at: "",
};

export interface HeroSlideshowProps {
  slides: HeroSlide[];
  defaultEyebrowLeft?: string;
  defaultEyebrowRight?: string;
  defaultHeadline?: string;
  defaultSubcopy?: string;
  compactPreview?: boolean;
}

export function HeroSlideshow({
  slides,
  defaultEyebrowLeft = "PHOTOGRAPHY · FILM · DESIGN",
  defaultEyebrowRight = "ACCRA / GHANA / WORLDWIDE",
  defaultHeadline = "Discover stories\nmade to last.",
  defaultSubcopy = "We capture celebrations, build visual identities and create films that feel unmistakably yours.",
  compactPreview = false,
}: HeroSlideshowProps) {
  const effectiveSlides = slides.length > 0 ? slides : [FALLBACK_SLIDE];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const totalSlides = effectiveSlides.length;
  const safeIndex = activeIndex % totalSlides;
  const activeSlide = effectiveSlides[safeIndex] ?? FALLBACK_SLIDE;

  const goNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  useEffect(() => {
    if (totalSlides <= 1 || isPaused) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % totalSlides);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [totalSlides, isPaused]);

  const leftEyebrow = activeSlide.eyebrow_left || defaultEyebrowLeft;
  const rightEyebrow = activeSlide.eyebrow_right || defaultEyebrowRight;
  const headlineText = activeSlide.headline || defaultHeadline;
  const subcopyText = activeSlide.subcopy || defaultSubcopy;

  const stageHeightClass = compactPreview
    ? "min-h-[340px] sm:min-h-[400px]"
    : "min-h-[470px] sm:min-h-[540px] lg:min-h-[600px]";

  const wrapperClass = compactPreview
    ? "w-full"
    : "mx-auto max-w-[1440px] px-3 pt-3 pb-8 sm:px-6 sm:pt-4 sm:pb-10";

  return (
    <div className="bg-[var(--black)]">
      <div className={wrapperClass}>
        <section
          aria-roledescription="carousel"
          aria-label="Featured studio highlights"
          tabIndex={0}
          onKeyDown={(e) => {
            if (totalSlides <= 1) return;
            if (e.key === "ArrowRight") {
              e.preventDefault();
              goNext();
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              goPrev();
            }
          }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocusCapture={() => setIsPaused(true)}
          onBlurCapture={() => setIsPaused(false)}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            if (totalSlides <= 1 || touchStartX.current === null) return;
            const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
            const delta = endX - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(delta) < 45) return;
            if (delta < 0) {
              goNext();
            } else {
              goPrev();
            }
          }}
          className={`relative overflow-hidden rounded-[22px] sm:rounded-[28px] bg-[#0A0A0B] text-white ${stageHeightClass} flex flex-col justify-between border border-white/10 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.5)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#DDF852]`}
        >
          {/* Crossfading background slides */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            {effectiveSlides.map((slide, idx) => {
              const isCurrent = idx === safeIndex;
              return (
                <img
                  key={slide.id}
                  src={resolveImageUrl(slide.image_public_id, { width: 1920 })}
                  alt={isCurrent ? slide.alt_text : ""}
                  aria-hidden={!isCurrent}
                  loading={idx === 0 ? "eager" : "lazy"}
                  fetchPriority={idx === 0 ? "high" : "auto"}
                  style={{ objectPosition: `${slide.focal_x}% ${slide.focal_y}%` }}
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out motion-reduce:transition-none ${
                    isCurrent ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
                />
              );
            })}

            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/15 to-black/85" />
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
          </div>

          {/* Top corner micro-metadata row */}
          <div className="relative z-10 flex items-center justify-between gap-4 px-5 pt-5 sm:px-10 sm:pt-8">
            <p className="font-mono-meta text-[10px] sm:text-xs uppercase tracking-[0.22em] text-white/85">
              {leftEyebrow}
            </p>
            <p className="font-mono-meta text-[10px] sm:text-xs uppercase tracking-[0.22em] text-white/85 text-right">
              {rightEyebrow}
            </p>
          </div>

          {/* Bottom editorial headline + right copy, circular Book CTA & slideshow controls */}
          <div className="relative z-10 flex flex-col gap-7 px-5 pb-6 pt-16 sm:px-10 sm:pb-9 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              {compactPreview ? (
                <p className="font-display font-bold text-[clamp(1.85rem,4.4vw,3.4rem)] leading-[0.96] tracking-[-0.03em] text-white whitespace-pre-line max-w-[13ch]">
                  {headlineText}
                </p>
              ) : (
                <h1 className="font-display font-bold text-[clamp(2.4rem,6.4vw,5.1rem)] leading-[0.96] tracking-[-0.03em] text-white whitespace-pre-line max-w-[13ch]">
                  {headlineText}
                </h1>
              )}
              <div
                aria-hidden="true"
                className="mt-4 h-[2px] w-full max-w-[300px] sm:max-w-[440px] bg-[#DDF852]"
              />
            </div>

            <div className="flex flex-col gap-5 sm:items-end lg:shrink-0">
              <div className="flex items-end justify-between gap-5 sm:justify-end sm:gap-7">
                <p className="max-w-[270px] text-sm sm:text-[15px] leading-relaxed text-white/90 text-left">
                  {subcopyText}
                </p>

                <Link
                  href="/book"
                  aria-label="Book a session or project"
                  className="inline-flex shrink-0 flex-col items-center justify-center h-[92px] w-[92px] sm:h-[108px] sm:w-[108px] rounded-full bg-[#DDF852] text-[#0A0A0B] font-display font-bold text-sm sm:text-base shadow-lg transition-transform duration-200 hover:scale-105 hover:bg-[#E8FF6E] active:scale-95 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0B]"
                >
                  <span>Book</span>
                  <ArrowUpRight className="mt-0.5 h-4 w-4 stroke-[2.2]" aria-hidden="true" />
                </Link>
              </div>

              <div className="flex items-center gap-2.5 self-end" role="group" aria-label="Slideshow controls">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={totalSlides <= 1}
                  aria-label="Previous slide"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-black/45 text-white backdrop-blur-sm transition-colors hover:border-white hover:bg-black/75 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </button>

                <div className="flex items-center gap-1 px-1" aria-label="Slide indicators">
                  {effectiveSlides.map((slide, idx) => {
                    const active = idx === safeIndex;
                    return (
                      <button
                        key={slide.id}
                        type="button"
                        onClick={() => setActiveIndex(idx)}
                        aria-label={`Go to slide ${idx + 1} of ${totalSlides}`}
                        aria-current={active ? "true" : undefined}
                        className="inline-flex min-h-[32px] min-w-[18px] items-center justify-center px-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full cursor-pointer"
                      >
                        <span
                          className={`block h-1.5 rounded-full transition-all duration-300 ${
                            active
                              ? "w-6 bg-[#DDF852]"
                              : "w-1.5 bg-white/55 hover:bg-white/85"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={totalSlides <= 1}
                  aria-label="Next slide"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-black/45 text-white backdrop-blur-sm transition-colors hover:border-white hover:bg-black/75 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <span className="sr-only" aria-live="polite">
            Slide {safeIndex + 1} of {totalSlides}: {activeSlide.alt_text}
          </span>
        </section>
      </div>
    </div>
  );
}
