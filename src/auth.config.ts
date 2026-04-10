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

  pages: {
    signIn: "/login",
    error: "/login",
  },
};
