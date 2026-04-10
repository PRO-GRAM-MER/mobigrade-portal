import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            fullName: true,
            email: true,
            mobile: true,
            passwordHash: true,
            role: true,
            verificationStatus: true,
          },
        });
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
});
