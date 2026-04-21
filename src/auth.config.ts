<<<<<<< HEAD
import type { NextAuthConfig } from "next-auth"

const SELLER_ROUTES = ["/dashboard", "/categories", "/products", "/orders", "/earnings", "/profile", "/settings", "/marketplace"]
const ADMIN_ROUTES = ["/admin"]
const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password", "/admin/login"]

export const authConfig: NextAuthConfig = {
=======
import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible auth config — no Node.js-only imports (Prisma, bcrypt).
 * Imported by both src/auth.ts (full server config) and src/middleware.ts
 * (Edge runtime). Keep this file free of any imports that use Node.js APIs.
 */
export const authConfig: NextAuthConfig = {
  providers: [], // populated in src/auth.ts with Credentials provider
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.mobile = user.mobile;
        token.verificationStatus = user.verificationStatus;
      }
      return token;
    },
    session({ session, token }) {
      // next-auth v5 beta 30: token values typed as unknown — explicit casts required
      session.user.id = token.id as string;
      session.user.role = token.role as typeof session.user.role;
      session.user.mobile = token.mobile as string;
      session.user.verificationStatus = token.verificationStatus as typeof session.user.verificationStatus;
      return session;
    },
  },

  session: { strategy: "jwt" },

>>>>>>> 607b0b216c834b27ddb27ee7dbf87bdd6a4e98c8
  pages: {
    signIn: "/login",
    error: "/login",
  },
<<<<<<< HEAD
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const role = auth?.user?.role
      const pathname = nextUrl.pathname

      const isAuthRoute = AUTH_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"))
      const isAdminRoute = ADMIN_ROUTES.some((p) => pathname.startsWith(p))
      const isSellerRoute = SELLER_ROUTES.some((p) => pathname.startsWith(p))

      if (isLoggedIn && isAuthRoute) {
        const dest = role === "ADMIN" ? "/admin/dashboard" : "/dashboard"
        return Response.redirect(new URL(dest, nextUrl))
      }

      if (isAdminRoute && !isLoggedIn) {
        return Response.redirect(new URL("/admin/login", nextUrl))
      }
      if (isAdminRoute && role !== "ADMIN") {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }

      if (isSellerRoute && !isLoggedIn) {
        return Response.redirect(new URL("/login", nextUrl))
      }
      if (isSellerRoute && role === "ADMIN") {
        return Response.redirect(new URL("/admin/dashboard", nextUrl))
      }

      return true
    },
  },
}
=======
};
>>>>>>> 607b0b216c834b27ddb27ee7dbf87bdd6a4e98c8
