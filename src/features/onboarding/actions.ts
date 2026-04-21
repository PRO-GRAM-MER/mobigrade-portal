"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { rejectSchema } from "./schemas"
import type { ActionResult } from "@/types"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") return null
  return session
}

export async function approveKYCAction(sellerId: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, error: "Unauthorized" }

  const profile = await db.sellerProfile.findUnique({ where: { userId: sellerId } })
  if (!profile) return { success: false, error: "Seller profile not found" }

  await db.sellerProfile.update({
    where: { userId: sellerId },
    data: {
      verificationStatus: "APPROVED",
      kycRejectionReason: null,
      kycChangeRequestStatus: "NONE",
      kycChangeRequestedAt: null,
    },
  })

  revalidatePath(`/admin/onboarding/sellers/${sellerId}`)
  revalidatePath("/admin/onboarding/sellers")
  return { success: true, message: "KYC approved successfully" }
}

export async function rejectKYCAction(
  sellerId: string,
  reason: string
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, error: "Unauthorized" }

  const parsed = rejectSchema.safeParse({ reason })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid reason" }

  const profile = await db.sellerProfile.findUnique({ where: { userId: sellerId } })
  if (!profile) return { success: false, error: "Seller profile not found" }

  await db.sellerProfile.update({
    where: { userId: sellerId },
    data: {
      verificationStatus: "REJECTED",
      kycRejectionReason: parsed.data.reason,
    },
  })

  revalidatePath(`/admin/onboarding/sellers/${sellerId}`)
  revalidatePath("/admin/onboarding/sellers")
  return { success: true, message: "KYC rejected" }
}

export async function acceptKYCChangeRequestAction(sellerId: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, error: "Unauthorized" }

  const profile = await db.sellerProfile.findUnique({ where: { userId: sellerId } })
  if (!profile) return { success: false, error: "Seller profile not found" }
  if (profile.kycChangeRequestStatus !== "REQUESTED") {
    return { success: false, error: "No pending change request" }
  }

  await db.sellerProfile.update({
    where: { userId: sellerId },
    data: { kycChangeRequestStatus: "ACCEPTED" },
  })

  revalidatePath(`/admin/onboarding/sellers/${sellerId}`)
  return { success: true, message: "Change request accepted" }
}

export async function denyKYCChangeRequestAction(sellerId: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, error: "Unauthorized" }

  await db.sellerProfile.update({
    where: { userId: sellerId },
    data: { kycChangeRequestStatus: "NONE", kycChangeRequestedAt: null },
  })

  revalidatePath(`/admin/onboarding/sellers/${sellerId}`)
  return { success: true, message: "Change request denied" }
}
