export function resolveImageUrl(
  publicId: string | null | undefined,
  options?: { width?: number }
): string {
  if (!publicId) {
    return "/media/fallback-frame.svg";
  }
  const trimmed = publicId.trim();
  if (!trimmed) {
    return "/media/fallback-frame.svg";
  }
  // Reject protocol-relative open redirects such as //attacker.com/...
  if (trimmed.startsWith("//")) {
    return "/media/fallback-frame.svg";
  }
  if (trimmed.startsWith("/")) {
    return trimmed;
  }
  const widthTransform = options?.width ? `w_${options.width},c_limit,` : "";
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    const cloudinaryMatch = trimmed.match(
      /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/
    );
    if (cloudinaryMatch?.[1] && cloudinaryMatch[2]) {
      const rest = cloudinaryMatch[2];
      if (!rest.includes("f_auto")) {
        return `${cloudinaryMatch[1]}f_auto,q_auto,${widthTransform}${rest}`;
      }
    }
    return trimmed;
  }
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (cloudName && !trimmed.startsWith("local/")) {
    return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,${widthTransform}${trimmed}`;
  }
  const cleanId = trimmed.replace(/^local\//, "");
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
    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
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
    if (host === "vimeo.com" || host.endsWith(".vimeo.com")) {
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
