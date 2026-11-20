import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const isPreview = process.env.VERCEL_ENV === "preview" || !isProd;

const vercelLiveScript = isPreview ? " https://vercel.live" : "";
const vercelLiveConnect = isPreview
  ? " https://vercel.live wss://*.pusher.com https://*.pusher.com https://*.pusherapp.com"
  : "";
const vercelLiveFont = isPreview ? " https://assets.vercel.com" : "";
const vercelLiveImg = isPreview ? " https://vercel.live https://vercel.com" : "";
const vercelLiveFrame = isPreview ? " https://vercel.live" : "";
const unsafeEval = isProd ? "" : " 'unsafe-eval'";

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${unsafeEval}${vercelLiveScript}`,
  `script-src-elem 'self' 'unsafe-inline'${vercelLiveScript}`,
  `style-src 'self' 'unsafe-inline'${vercelLiveScript}`,
  `style-src-elem 'self' 'unsafe-inline'${vercelLiveScript}`,
  `img-src 'self' data: blob: https://res.cloudinary.com https://i.ytimg.com https://i.vimeocdn.com${vercelLiveImg}`,
  `font-src 'self' data: https://fonts.gstatic.com${vercelLiveFont}`,
  `connect-src 'self' https://api.cloudinary.com${vercelLiveConnect}`,
  `frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com${vercelLiveFrame}`,
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  serverExternalPackages: ["@electric-sql/pglite"],
  outputFileTracingIncludes: {
    "/**": ["supabase/**/*"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 604800,
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "i.vimeocdn.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: cspDirectives,
          },
        ],
      },
      {
        source: "/booking/status/:reference*",
        headers: [
          {
            key: "Referrer-Policy",
            value: "no-referrer",
          },
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
      {
        source: "/media/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
