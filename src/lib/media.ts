export function resolveImageUrl(
  publicId: string | null | undefined,
  options?: { width?: number }
): string {
  if (!publicId) {
    return "/media/fallback-frame.svg";
  }
  if (publicId.startsWith("/") || publicId.startsWith("http://") || publicId.startsWith("https://")) {
    return publicId;
  }
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (cloudName && !publicId.startsWith("local/")) {
    const widthTransform = options?.width ? `w_${options.width},c_limit,` : "";
    return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,${widthTransform}${publicId}`;
  }
  const cleanId = publicId.replace(/^local\//, "");
  return `/media/${cleanId}.svg`;
}

export function getVideoEmbedUrl(
  provider: "youtube" | "vimeo",
  videoId: string
): string {
  const safeId = encodeURIComponent(videoId.trim());
  if (provider === "youtube") {
    return `https://www.youtube-nocookie.com/embed/${safeId}?autoplay=1&rel=0`;
  }
  return `https://player.vimeo.com/video/${safeId}?autoplay=1&dnt=1`;
}

export function getVideoExternalUrl(
  provider: "youtube" | "vimeo",
  videoId: string
): string {
  const safeId = encodeURIComponent(videoId.trim());
  if (provider === "youtube") {
    return `https://www.youtube.com/watch?v=${safeId}`;
  }
  return `https://vimeo.com/${safeId}`;
}

export function parseVideoUrl(
  inputUrl: string
): { provider: "youtube" | "vimeo"; videoId: string } | null {
  try {
    const url = new URL(inputUrl.trim());
    const host = url.hostname.toLowerCase();
    if (host.includes("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{6,20}$/.test(v)) {
        return { provider: "youtube", videoId: v };
      }
      const embedMatch = url.pathname.match(/^\/(?:embed|shorts)\/([a-zA-Z0-9_-]{6,20})/);
      if (embedMatch?.[1]) {
        return { provider: "youtube", videoId: embedMatch[1] };
      }
    }
    if (host === "youtu.be") {
      const id = url.pathname.replace(/^\//, "");
      if (/^[a-zA-Z0-9_-]{6,20}$/.test(id)) {
        return { provider: "youtube", videoId: id };
      }
    }
    if (host.includes("vimeo.com")) {
      const match = url.pathname.match(/\/(\d{6,15})/);
      if (match?.[1]) {
        return { provider: "vimeo", videoId: match[1] };
      }
    }
    return null;
  } catch {
    return null;
  }
}
