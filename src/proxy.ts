import { NextResponse, type NextRequest } from "next/server";

/**
 * VoteWise proxy (Next.js 16 successor to middleware.ts).
 * Security headers + light tenant hint.
 */
export function proxy(req: NextRequest) {
  const res = NextResponse.next();

  const isProd = process.env.NODE_ENV === "production";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";

  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=()");
  res.headers.set("X-DNS-Prefetch-Control", "on");

  if (isProd && proto === "https") {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' ws: wss: https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  res.headers.set("Content-Security-Policy", csp);

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.svg|robots.txt).*)"],
};
