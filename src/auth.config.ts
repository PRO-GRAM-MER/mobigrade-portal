import type { NextAuthConfig } from "next-auth"

const SELLER_ROUTES = ["/dashboard", "/categories", "/products", "/orders", "/earnings", "/profile", "/settings", "/marketplace"]
const ADMIN_ROUTES = ["/admin"]
const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password", "/admin/login"]

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
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
