"use client";

import { ChevronLeft, ChevronRight, ExternalLink, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  getVideoEmbedUrl,
  getVideoExternalUrl,
  resolveImageUrl,
} from "@/lib/media";
import type { MediaAsset } from "@/modules/portfolio/schema";

export function PortfolioGalleryClient({
  assets,
  title,
}: {
  assets: MediaAsset[];
  title: string;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [playingVideos, setPlayingVideos] = useState<Record<string, boolean>>({});
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setLightboxIndex(null);
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((prev) =>
          prev === null ? null : (prev + 1) % assets.length
        );
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) =>
          prev === null ? null : (prev - 1 + assets.length) % assets.length
        );
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lightboxIndex, assets.length]);

  const activeAsset = lightboxIndex !== null ? assets[lightboxIndex] : null;

  return (
    <>
      <div className="space-y-8">
        {assets.map((asset, idx) => {
          const width = asset.width ?? 1600;
          const height = asset.height ?? 1000;

          if (asset.type === "video_embed" && asset.video_provider && asset.video_id) {
            const isPlaying = Boolean(playingVideos[asset.id]);
            const posterUrl = resolveImageUrl(asset.poster_public_id, { width: 1600 });
            const embedUrl = getVideoEmbedUrl(asset.video_provider, asset.video_id);
            const externalUrl = getVideoExternalUrl(asset.video_provider, asset.video_id);

            return (
              <figure key={asset.id} className="border border-[var(--hairline)] bg-[var(--ink-2)] p-3">
                <div
                  className="relative w-full overflow-hidden bg-[var(--black)]"
                  style={{ aspectRatio: `${width} / ${height}` }}
                >
                  {isPlaying ? (
                    <iframe
                      src={embedUrl}
                      title={asset.alt_text ?? title}
                      className="h-full w-full border-0"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setPlayingVideos((prev) => ({ ...prev, [asset.id]: true }))
                      }
                      aria-label={`Play video: ${asset.caption ?? title}`}
                      className="group relative block h-full w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)]"
                    >
                      <img
                        src={posterUrl}
                        alt={asset.alt_text ?? title}
                        width={width}
                        height={height}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40 transition-colors group-hover:bg-black/25">
                        <span className="inline-flex min-h-[56px] items-center gap-2.5 rounded-[2px] bg-[var(--red)] px-5 py-3 text-sm font-bold text-[var(--btn-action-text)]">
                          <Play className="h-5 w-5 fill-current" aria-hidden="true" />
                          Play film
                        </span>
                      </span>
                    </button>
                  )}
                </div>
                <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--grey)]">
                  <span>{asset.caption ?? asset.alt_text}</span>
                  <a
                    href={externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center gap-1 text-[var(--cyan)] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)]"
                  >
                    Open in new tab
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </figcaption>
              </figure>
            );
          }

          const imageUrl = resolveImageUrl(asset.cloudinary_public_id, { width: 1600 });
          return (
            <figure key={asset.id} className="border border-[var(--hairline)] bg-[var(--ink-2)] p-3">
              <button
                type="button"
                onClick={() => setLightboxIndex(idx)}
                aria-label={`Open image ${idx + 1} of ${assets.length} in full screen`}
                className="block w-full cursor-zoom-in overflow-hidden bg-[var(--black)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)]"
                style={{ aspectRatio: `${width} / ${height}` }}
              >
                <img
                  src={imageUrl}
                  alt={asset.alt_text ?? title}
                  width={width}
                  height={height}
                  loading={idx === 0 ? "eager" : "lazy"}
                  className="h-full w-full object-cover"
                />
              </button>
              <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-2 font-mono-meta text-xs text-[var(--grey)]">
                <span>{asset.caption ?? asset.alt_text}</span>
                <span>
                  FRAME {String(idx + 1).padStart(2, "0")} / {String(assets.length).padStart(2, "0")}
                </span>
              </figcaption>
            </figure>
          );
        })}
      </div>

      {activeAsset && lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeAsset.caption ?? activeAsset.alt_text ?? title}
          className="fixed inset-0 z-50 flex flex-col justify-between bg-[var(--black)]/98 p-4 sm:p-6"
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
            const diff = endX - touchStartX.current;
            if (diff > 50) {
              setLightboxIndex((lightboxIndex - 1 + assets.length) % assets.length);
            } else if (diff < -50) {
              setLightboxIndex((lightboxIndex + 1) % assets.length);
            }
            touchStartX.current = null;
          }}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono-meta text-xs uppercase tracking-[0.12em] text-[var(--grey)]">
              FRAME {lightboxIndex + 1} OF {assets.length}
            </span>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={() => setLightboxIndex(null)}
              aria-label="Close lightbox"
              className="inline-flex h-[48px] w-[48px] items-center justify-center rounded-[2px] border-2 border-[var(--control-border)] text-[var(--white)] hover:border-[var(--cyan)] hover:text-[var(--cyan)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] cursor-pointer"
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <div className="relative my-auto flex items-center justify-center gap-3 overflow-hidden py-4">
            {assets.length > 1 && (
              <button
                type="button"
                aria-label="Previous image"
                onClick={() =>
                  setLightboxIndex((lightboxIndex - 1 + assets.length) % assets.length)
                }
                className="inline-flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[2px] border-2 border-[var(--control-border)] bg-[var(--ink-2)] text-[var(--white)] hover:border-[var(--cyan)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
            )}

            <div className="max-h-[75vh] max-w-5xl overflow-hidden">
              <img
                src={resolveImageUrl(
                  activeAsset.type === "video_embed"
                    ? activeAsset.poster_public_id
                    : activeAsset.cloudinary_public_id,
                  { width: 1600 }
                )}
                alt={activeAsset.alt_text ?? title}
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>

            {assets.length > 1 && (
              <button
                type="button"
                aria-label="Next image"
                onClick={() => setLightboxIndex((lightboxIndex + 1) % assets.length)}
                className="inline-flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[2px] border-2 border-[var(--control-border)] bg-[var(--ink-2)] text-[var(--white)] hover:border-[var(--cyan)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--cyan)] cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm text-[var(--white)]">{activeAsset.alt_text}</p>
            {activeAsset.caption && (
              <p className="mt-1 font-mono-meta text-xs text-[var(--grey)]">
                {activeAsset.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
