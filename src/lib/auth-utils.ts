import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

export function getResetTokenExpiry(): Date {
  return new Date(Date.now() + 60 * 60 * 1000) // 1 hour
}
