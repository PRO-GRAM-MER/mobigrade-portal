"use server"

import { db } from "@/lib/db"
import { hashPassword, generateToken, getResetTokenExpiry } from "@/lib/auth-utils"
import { sendPasswordResetEmail } from "@/lib/email"
import { signupSchema, forgotPasswordSchema, resetPasswordSchema } from "@/features/auth/schemas"

type ActionResult = { success: true } | { error: string }

export async function signupAction(data: unknown): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { firstName, lastName, email, phone, password } = parsed.data

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) return { error: "An account with this email already exists." }

  const hashed = await hashPassword(password)

  const user = await db.user.create({
    data: { firstName, lastName, email, phone, password: hashed, role: "SELLER" },
  })

  await db.sellerProfile.create({ data: { userId: user.id } })

  return { success: true }
}

export async function forgotPasswordAction(data: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(data)
  if (!parsed.success) return { error: "Invalid email address." }

  const { email } = parsed.data

  // Always return success — no enumeration
  const user = await db.user.findUnique({ where: { email } })
  if (!user) return { success: true }

  // Invalidate existing tokens
  await db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } })

  const token = generateToken()
  await db.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt: getResetTokenExpiry() },
  })

  await sendPasswordResetEmail(email, token)

  return { success: true }
}

export async function resetPasswordAction(data: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const { token, password } = parsed.data

  const record = await db.passwordResetToken.findUnique({ where: { token } })

  if (!record) return { error: "Invalid or expired reset link." }
  if (record.usedAt) return { error: "This reset link has already been used." }
  if (record.expiresAt < new Date()) return { error: "This reset link has expired. Request a new one." }

  const hashed = await hashPassword(password)

  await db.user.update({ where: { id: record.userId }, data: { password: hashed } })
  await db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } })

  return { success: true }
}
