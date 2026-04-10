import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";
import type { NextAuthRequest } from "next-auth";

const { auth } = NextAuth(authConfig);

const AUTH_ROUTES = ["/login", "/signup"];

const SELLER_PREFIXES = [
  "/dashboard",
  "/kyc",
  "/products",
  "/upload",
  "/categories",
];

const ADMIN_PREFIXES = ["/admin"];

export const middleware = auth((req: NextAuthRequest) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const role = session?.user?.role as "SELLER" | "ADMIN" | "RETAILER" | undefined;
  const isAuthenticated = !!session;

  const isAuthRoute = AUTH_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );
  const isSellerRoute = SELLER_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  const isAdminRoute = ADMIN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  // ── Unauthenticated ────────────────────────────────────────────────────────

  if (!isAuthenticated && (isSellerRoute || isAdminRoute)) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // ── Authenticated → push away from auth pages ──────────────────────────────

  if (isAuthenticated && isAuthRoute) {
    const home = role === "ADMIN" ? "/admin/dashboard" : "/dashboard";
    return NextResponse.redirect(new URL(home, req.url));
  }

  // ── Role enforcement ───────────────────────────────────────────────────────

  if (isAdminRoute && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isSellerRoute && role !== "SELLER") {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
