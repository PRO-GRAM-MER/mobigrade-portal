import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // Only SELLER and ADMIN roles can log in here
        if (user.role !== "SELLER" && user.role !== "ADMIN") return null;

        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          verificationStatus: user.verificationStatus,
        };
      },
    }),
  ],

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
      // NextAuth v5 beta 30: token values typed as unknown — explicit casts required
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
});
