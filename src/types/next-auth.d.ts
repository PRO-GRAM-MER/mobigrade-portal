import type { UserRole, VerificationStatus } from "@prisma/client";
import type { DefaultSession, DefaultJWT } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      verificationStatus: VerificationStatus;
      mobile: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    verificationStatus: VerificationStatus;
    mobile: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: UserRole;
    verificationStatus: VerificationStatus;
    mobile: string;
  }
}
