import NextAuth from "next-auth"
import { NextResponse, type NextRequest } from "next/server"
import { authConfig } from "@/auth.config"

const { auth } = NextAuth(authConfig)

export const proxy = auth(function proxyHandler(_req) {
  return NextResponse.next()
}) as (req: NextRequest) => Response | NextResponse | Promise<Response | NextResponse>

export const config = {
  matcher: [
    "/api/auth/callback/credentials",
    "/((?!api/auth|_next/static|_next/image|favicon|public).*)",
  ],
}
