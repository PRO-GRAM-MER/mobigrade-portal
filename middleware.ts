import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// ─── Simple in-memory rate limiter ───────────────────────────────────────────
// Protects /api/auth against brute-force on a single serverless instance.
// For distributed protection across Vercel instances, swap this for Vercel KV.

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const authAttempts = new Map<string, RateLimitRecord>();

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10;           // max 10 auth attempts per IP per minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = authAttempts.get(ip);

  if (!record || now > record.resetAt) {
    authAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  record.count += 1;
  if (record.count > RATE_LIMIT_MAX) return true;

  return false;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Rate limit: /api/auth/* ──────────────────────────────────────────────
  if (pathname.startsWith("/api/auth")) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    if (isRateLimited(ip)) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again in a minute." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        }
      );
    }
  }

  // ── Auth guard: protected routes only ───────────────────────────────────
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/catalog") ||
    pathname.startsWith("/categories") ||
    pathname.startsWith("/spare-parts") ||
    pathname.startsWith("/products") ||
    pathname.startsWith("/kyc") ||
    pathname.startsWith("/upload");

  if (!isProtected) return NextResponse.next();

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Not authenticated → login
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin trying to access seller routes → admin dashboard
  if (!pathname.startsWith("/admin") && token.role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }

  // Seller trying to access admin routes → seller dashboard
  if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protected app routes
    "/dashboard/:path*",
    "/admin/:path*",
    "/catalog/:path*",
    "/categories/:path*",
    "/spare-parts/:path*",
    "/products/:path*",
    "/kyc/:path*",
    "/upload/:path*",
    // Auth API (for rate limiting)
    "/api/auth/:path*",
  ],
};
