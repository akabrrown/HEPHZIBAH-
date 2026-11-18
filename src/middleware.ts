import { NextResponse, type NextRequest } from "next/server";
import { isBotOrMaliciousCrawler } from "@/lib/rate-limit";

// Cookie name for admin session
const ADMIN_SESSION_COOKIE = "hm_admin_session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Fast Bot Defense at the edge: Block known scanners from invoking Server Components or APIs
  const userAgent = req.headers.get("user-agent");
  if (isBotOrMaliciousCrawler(userAgent)) {
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

  // 2. Fast-Exit for Admin Routes:
  // If an unauthenticated user visits protected /admin/* (except /admin/sign-in),
  // instantly redirect them without running Server Components, layouts, or database queries.
  if (pathname.startsWith("/admin") && pathname !== "/admin/sign-in") {
    const sessionCookie = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!sessionCookie) {
      const signInUrl = new URL("/admin/sign-in", req.url);
      signInUrl.searchParams.set("returnTo", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // 3. Forward request with tracking headers and security enhancements
  const response = NextResponse.next();

  // Ensure security headers are always enforced
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

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
