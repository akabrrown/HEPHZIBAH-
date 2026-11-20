import { NextResponse, type NextRequest } from "next/server";
import { isBotOrMaliciousCrawler } from "@/lib/rate-limit";

// Cookie name for admin session
const ADMIN_SESSION_COOKIE = "hm_admin_session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Fast Bot Defense at the edge: Block known scanners & aggressive AI scrapers.
  // Allow empty User-Agent only on machine health/cron endpoints so uptime monitors can probe.
  const userAgent = req.headers.get("user-agent");
  const isMachineEndpoint = pathname === "/api/health" || pathname.startsWith("/api/cron/");
  const isEmptyUa = !userAgent || userAgent.trim().length === 0;
  if (!(isMachineEndpoint && isEmptyUa) && isBotOrMaliciousCrawler(userAgent)) {
    return new NextResponse(
      JSON.stringify({
        type: "https://hephzibahmedia.com/problems/bot_forbidden",
        title: "Automated scanner blocked",
        status: 403,
        detail: "Access denied by security bot defense policy.",
      }),
      {
        status: 403,
        headers: {
          "content-type": "application/problem+json",
          "x-bot-blocked": "true",
        },
      }
    );
  }

  // 2. Fast-Exit for Admin Pages & APIs without running Server Components or DB queries:
  const sessionCookie = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (pathname.startsWith("/admin") && pathname !== "/admin/sign-in") {
    if (!sessionCookie) {
      const signInUrl = new URL("/admin/sign-in", req.url);
      signInUrl.searchParams.set("returnTo", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  if (
    pathname.startsWith("/api/admin/") &&
    pathname !== "/api/admin/auth/sign-in" &&
    pathname !== "/api/admin/auth/sign-out"
  ) {
    const hasBearerOnMetrics =
      (pathname === "/api/admin/metrics" || pathname === "/api/admin/telemetry") &&
      (req.headers.get("authorization") ?? "").toLowerCase().startsWith("bearer ");
    if (!sessionCookie && !hasBearerOnMetrics) {
      return new NextResponse(
        JSON.stringify({
          type: "https://hephzibahmedia.com/problems/unauthorized",
          title: "Sign in required",
          status: 401,
          code: "unauthorized",
          detail: "Please sign in to the admin desk.",
        }),
        {
          status: 401,
          headers: {
            "content-type": "application/problem+json",
            "cache-control": "no-store",
          },
        }
      );
    }
  }

  // 3. Forward request with consistent security headers
  const response = NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  if (pathname.startsWith("/booking/status/")) {
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Cache-Control", "no-store, max-age=0");
  } else {
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static asset chunks)
     * - _next/image (image optimization files)
     * - media/ (static photography/film assets)
     * - fonts/ (static font files)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|media|fonts|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
