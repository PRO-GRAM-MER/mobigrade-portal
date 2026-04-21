import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { authConfig } from "@/auth.config"
import { db } from "@/lib/db"
import { verifyPassword } from "@/lib/auth-utils"
import { loginSchema } from "@/features/auth/schemas"

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,

  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        const user = await db.user.findUnique({ where: { email } })
        if (!user || !user.password) return null
        if (!user.isActive) throw new Error("AccountSuspended")

        const valid = await verifyPassword(password, user.password)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone ?? undefined,
          role: user.role,
          avatarUrl: user.avatarUrl ?? undefined,
        }
      },
    }),
  ],

  callbacks: {
    ...authConfig.callbacks,

    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.firstName = user.firstName
        token.lastName = user.lastName
        token.phone = user.phone
        token.role = user.role
        token.avatarUrl = user.avatarUrl
      }
      return token
    },

    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.firstName = token.firstName as string
        session.user.lastName = token.lastName as string
        session.user.phone = token.phone as string | undefined
        session.user.role = token.role as "ADMIN" | "SELLER"
        session.user.avatarUrl = token.avatarUrl as string | undefined
      }
      return session
    },
  },
})
