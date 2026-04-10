"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { signupSchema } from "@/lib/validations/auth";
import type { SignupInput } from "@/lib/validations/auth";

const log = logger("auth-actions");

const resend = new Resend(process.env.RESEND_API_KEY);

type ActionResult =
  | { success: true }
  | { success: false; fieldErrors?: Partial<Record<keyof SignupInput, string[]>>; error?: string };

export async function signupAction(data: SignupInput): Promise<ActionResult> {
  // 1. Validate
  const parsed = signupSchema.safeParse(data);
  if (!parsed.success) {
    log.warn("signup validation failed", { errors: parsed.error.flatten().fieldErrors });
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Partial<
        Record<keyof SignupInput, string[]>
      >,
    };
  }

  const { fullName, email, mobile, password } = parsed.data;

  // 2. Check uniqueness
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { mobile }] },
    select: { email: true, mobile: true },
  });

  if (existing) {
    log.warn("signup conflict", { emailConflict: existing.email === email, mobileConflict: existing.mobile === mobile });
    return {
      success: false,
      fieldErrors: {
        ...(existing.email === email && { email: ["Email is already registered"] }),
        ...(existing.mobile === mobile && { mobile: ["Mobile number is already registered"] }),
      },
    };
  }

  // 3. Hash password (cost factor 12)
  const passwordHash = await bcrypt.hash(password, 12);

  // 4. Create user + stub SellerProfile in one transaction
  await prisma.$transaction([
    prisma.user.create({
      data: {
        fullName,
        email,
        mobile,
        passwordHash,
        role: "SELLER",
        verificationStatus: "KYC_PENDING",
        sellerProfile: {
          create: {},
        },
      },
    }),
  ]);

  log.info("seller signed up", { email });
  return { success: true };
}

/* ─── Forgot Password ────────────────────────────────────────────────────── */

type SimpleResult = { success: true } | { success: false; error?: string };

export async function forgotPasswordAction(email: string): Promise<SimpleResult> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, fullName: true, email: true, role: true },
  });

  // Always return success to avoid email enumeration
  if (!user) return { success: true };

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: token, passwordResetExpiry: expiry },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  const roleLabel = user.role === "ADMIN" ? "Administrator" : "Seller";

  log.info("password reset requested", { userId: user.id });
  try {
    await resend.emails.send({
      from: "MobiGrade Portal <noreply@mobigrade.in>",
      to: user.email,
      subject: "Reset your MobiGrade Portal password",
      html: `
        <div style="font-family:'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:12px;">
          <div style="margin-bottom:24px;">
            <span style="font-size:20px;font-weight:700;color:#2F3567;">MobiGrade Portal</span>
            <span style="font-size:10px;font-weight:600;letter-spacing:0.1em;color:#FF6F3F;vertical-align:top;margin-left:6px;">${roleLabel.toUpperCase()}</span>
          </div>
          <h2 style="font-size:22px;font-weight:700;color:#2F3567;margin-bottom:8px;">Reset your password</h2>
          <p style="color:#4A4C5F;font-size:14px;line-height:1.65;margin-bottom:24px;">
            Hi ${user.fullName}, we received a request to reset the password for your MobiGrade Portal ${roleLabel} account.
            Click the button below to set a new password.
          </p>
          <a href="${resetUrl}" style="display:inline-block;background:#FF6F3F;color:#ffffff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;text-decoration:none;">
            Reset Password
          </a>
          <p style="color:#9B9B9B;font-size:12px;margin-top:24px;line-height:1.6;">
            This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.
          </p>
          <hr style="border:none;border-top:1px solid #E6E6E6;margin:24px 0;" />
          <p style="color:#C5C5C5;font-size:11px;">© ${new Date().getFullYear()} MobiGrade Portal · All rights reserved</p>
        </div>
      `,
    });
  } catch (err) {
    log.error("forgot-password email send failed", { userId: user.id, error: String(err) });
  }

  return { success: true };
}

/* ─── Reset Password ─────────────────────────────────────────────────────── */

type ResetResult = { success: true } | { success: false; error?: string };

export async function resetPasswordAction(token: string, newPassword: string): Promise<ResetResult> {
  if (!token) return { success: false, error: "INVALID_TOKEN" };

  const user = await prisma.user.findUnique({
    where: { passwordResetToken: token },
    select: { id: true, passwordResetExpiry: true },
  });

  if (!user || !user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
    log.warn("password reset attempt with invalid/expired token");
    return { success: false, error: "INVALID_TOKEN" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
    },
  });

  log.info("password reset succeeded", { userId: user.id });
  return { success: true };
}
