import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    id: string
    firstName: string
    lastName: string
    phone?: string
    role: "ADMIN" | "SELLER"
    avatarUrl?: string
  }

  interface Session {
    user: User & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    firstName: string
    lastName: string
    phone?: string
    role: "ADMIN" | "SELLER"
    avatarUrl?: string
  }
}
