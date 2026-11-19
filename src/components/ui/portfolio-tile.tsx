import Link from "next/link";
import { resolveImageUrl } from "@/lib/media";
import type { PortfolioItem } from "@/modules/portfolio/schema";
import { FramingCorners, RecDot, ShotCaption } from "./viewfinder";

export function PortfolioTile({ item }: { item: PortfolioItem }) {
  const cover = item.cover_asset;
  const imgPublicId =
    cover?.type === "video_embed" ? cover.poster_public_id : cover?.cloudinary_public_id;
  const imgUrl = resolveImageUrl(imgPublicId, { width: 900 });
  const width = cover?.width ?? 1600;
  const height = cover?.height ?? 1067;
  const year = item.shot_on ? item.shot_on.slice(0, 4) : "2026";
  const countLabel =
    cover?.type === "video_embed" && cover.duration_seconds
      ? `${Math.floor(cover.duration_seconds / 60)}:${String(cover.duration_seconds % 60).padStart(2, "0")}`
      : item.media_count
        ? `${item.media_count} ${item.media_count === 1 ? "FRAME" : "FRAMES"}`
        : null;

  return (
    <FramingCorners className="group bg-[var(--ink-2)] border border-[var(--hairline)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-[var(--cyan)]/50">
      <Link
        href={`/portfolio/${item.slug}`}
        className={`block p-3 focus-visible:outline-none ${item.kind === "videography" ? "vf-rec-tile" : ""}`}
      >
        <div
          className="relative w-full overflow-hidden bg-[var(--black)]"
          style={{ aspectRatio: `${width} / ${height}` }}
        >
          <img
            src={imgUrl}
            alt={cover?.alt_text ?? item.title}
            width={width}
            height={height}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
          />
          {item.kind === "videography" && (
            <div className="absolute top-3 left-3 bg-[var(--black)]/90 px-2.5 py-1 border border-[var(--hairline)]">
              <RecDot label="VIDEO" />
            </div>
          )}
        </div>

        <div className="mt-3 space-y-1">
          <ShotCaption parts={[item.occasion_name ?? item.kind, item.location_text, year, countLabel]} />
          <h3 className="font-display text-lg font-bold text-[var(--white)] group-hover:text-[var(--cyan)] transition-colors">
            {item.title}
          </h3>
        </div>
      </Link>
    </FramingCorners>
  );
}
