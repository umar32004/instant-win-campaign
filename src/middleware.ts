import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_ACCESS_COOKIE, verifyAdminAccessToken } from "@/lib/jwt";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Edge middleware handling two cross-cutting security concerns:
 *
 * 1. CSRF defense-in-depth: our auth cookies already use SameSite=Strict
 *    (admin) / SameSite=Lax (participant), which blocks the cookie from
 *    being sent on cross-site requests in modern browsers. This adds a
 *    second layer by rejecting mutating API requests whose Origin header
 *    doesn't match our own origin.
 * 2. Early admin-route auth redirect: bounces unauthenticated visitors to
 *    /admin/login before any dashboard page work happens, using `jose`
 *    (edge-runtime compatible) to verify the JWT.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/") && MUTATING_METHODS.has(req.method)) {
    const origin = req.headers.get("origin");
    if (origin) {
      const allowedOrigin = req.nextUrl.origin;
      if (origin !== allowedOrigin) {
        return NextResponse.json({ success: false, error: "Cross-origin request blocked." }, { status: 403 });
      }
    }
  }

  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !pathname.startsWith("/api/")) {
    const token = req.cookies.get(ADMIN_ACCESS_COOKIE)?.value;
    const claims = token ? await verifyAdminAccessToken(token) : null;
    if (!claims) {
      const loginUrl = new URL("/admin/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  const response = NextResponse.next();
  const isDev = process.env.NODE_ENV !== "production";
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      // Next.js dev mode's webpack HMR bundle relies on eval()-based module
      // wrapping, which requires 'unsafe-eval' — without it the entire
      // client bundle silently fails to execute (SSR HTML still renders,
      // but no hydration/interactivity happens anywhere on the site). The
      // production build does not use eval(), so this stays out of the
      // production CSP.
      isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.blob.core.windows.net",
      "font-src 'self' data:",
      isDev ? "connect-src 'self' ws:" : "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
