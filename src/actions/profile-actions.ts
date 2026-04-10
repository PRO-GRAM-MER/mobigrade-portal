"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type Result<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

/* ── Update avatar ────────────────────────────────────────────────────────── */
export async function updateAvatarAction(url: string): Promise<Result> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarUrl: url },
  });
  return { success: true };
}

/* ── Change password ─────────────────────────────────────────────────────── */
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Required"),
  newPassword: z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
});

export async function changePasswordAction(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<Result> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" };

  const parsed = changePasswordSchema.safeParse(data);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return { success: false, error: first ?? "Validation error" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });
  if (!user) return { success: false, error: "User not found" };

  const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!valid) return { success: false, error: "Current password is incorrect" };

  const hash = await bcrypt.hash(data.newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: hash },
  });
  return { success: true };
}

/* ── Request KYC edit (seller, after APPROVED) ───────────────────────────── */
export async function requestKycEditAction(): Promise<Result> {
  const session = await auth();
  if (!session || session.user.role !== "SELLER") {
    return { success: false, error: "Unauthorized" };
  }

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      kycSubmission: { select: { id: true, status: true } },
    },
  });

  const kyc = profile?.kycSubmission;
  if (!kyc) return { success: false, error: "No KYC submission found" };
  if (kyc.status !== "APPROVED") {
    return { success: false, error: "KYC must be approved before requesting an edit" };
  }

  await prisma.kycSubmission.update({
    where: { id: kyc.id },
    data: { status: "EDIT_REQUESTED" as any },
  });
  return { success: true };
}

/* ── Admin: approve KYC edit request ────────────────────────────────────── */
export async function approveKycEditAction(submissionId: string): Promise<Result> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  await prisma.kycSubmission.update({
    where: { id: submissionId },
    data: { status: "EDIT_UNLOCKED" as any },
  });
  return { success: true };
}
