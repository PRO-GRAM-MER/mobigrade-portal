"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { uploadToCloudinary } from "@/lib/cloudinary"
import { changePasswordSchema, kycSchema } from "./schemas"
import type { ActionResult } from "@/types"

export async function updateAvatarAction(formData: FormData): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  const file = formData.get("avatar") as File | null
  if (!file || file.size === 0) return { success: false, error: "No file provided" }

  if (file.size > 5 * 1024 * 1024) return { success: false, error: "File too large (max 5MB)" }
  if (!file.type.startsWith("image/")) return { success: false, error: "Must be an image" }

  try {
    const url = await uploadToCloudinary(file, "mobigrade/avatars")
    await db.user.update({ where: { id: session.user.id }, data: { avatarUrl: url } })
    revalidatePath("/profile")
    return { success: true }
  } catch {
    return { success: false, error: "Upload failed. Try again." }
  }
}

export async function changePasswordAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  const raw = {
    currentPassword: formData.get("currentPassword") as string,
    newPassword: formData.get("newPassword") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  }

  const parsed = changePasswordSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  })
  if (!user?.password) return { success: false, error: "No password set on this account" }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.password)
  if (!valid) return { success: false, error: "Current password is incorrect" }

  const hashed = await bcrypt.hash(parsed.data.newPassword, 12)
  await db.user.update({ where: { id: session.user.id }, data: { password: hashed } })

  return { success: true, message: "Password updated successfully" }
}

export async function submitKYCAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }

    const profile = await db.sellerProfile.findUnique({ where: { userId: session.user.id } })
    if (profile?.verificationStatus === "UNDER_REVIEW") {
      return { success: false, error: "KYC already under review" }
    }
    if (profile?.verificationStatus === "APPROVED") {
      if (profile?.kycChangeRequestStatus !== "ACCEPTED") {
        return { success: false, error: "KYC already approved. Request a change first." }
      }
    }

    const raw = {
      businessName: (formData.get("businessName") as string) || undefined,
      gstNumber: formData.get("gstNumber") as string,
      aadhaarNumber: formData.get("aadhaarNumber") as string,
      panNumber: formData.get("panNumber") as string,
    }

    const parsed = kycSchema.safeParse(raw)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" }

    const aadhaarFile = formData.get("aadhaarImage") as File | null
    const panFile = formData.get("panImage") as File | null

    if (!aadhaarFile || aadhaarFile.size === 0) return { success: false, error: "Aadhaar image is required" }
    if (!panFile || panFile.size === 0) return { success: false, error: "PAN image is required" }

    if (aadhaarFile.size > 5 * 1024 * 1024) return { success: false, error: "Aadhaar image too large (max 5MB)" }
    if (panFile.size > 5 * 1024 * 1024) return { success: false, error: "PAN image too large (max 5MB)" }

    const [aadhaarImageUrl, panImageUrl] = await Promise.all([
      uploadToCloudinary(aadhaarFile, "mobigrade/kyc"),
      uploadToCloudinary(panFile, "mobigrade/kyc"),
    ])

    await db.sellerProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        verificationStatus: "UNDER_REVIEW",
        businessName: parsed.data.businessName,
        gstNumber: parsed.data.gstNumber,
        aadhaarNumber: parsed.data.aadhaarNumber,
        aadhaarImageUrl,
        panNumber: parsed.data.panNumber,
        panImageUrl,
        kycSubmittedAt: new Date(),
        kycRejectionReason: null,
      },
      update: {
        verificationStatus: "UNDER_REVIEW",
        businessName: parsed.data.businessName,
        gstNumber: parsed.data.gstNumber,
        aadhaarNumber: parsed.data.aadhaarNumber,
        aadhaarImageUrl,
        panNumber: parsed.data.panNumber,
        panImageUrl,
        kycSubmittedAt: new Date(),
        kycRejectionReason: null,
        kycChangeRequestStatus: "NONE",
        kycChangeRequestedAt: null,
      },
    })

    revalidatePath("/profile")
    revalidatePath("/dashboard")
    return { success: true, message: "KYC submitted successfully" }
  } catch (err) {
    console.error("submitKYCAction error:", err)
    return { success: false, error: "Submission failed. Please try again." }
  }
}

export async function requestKYCChangeAction(): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }

    const profile = await db.sellerProfile.findUnique({ where: { userId: session.user.id } })
    if (!profile) return { success: false, error: "Profile not found" }
    if (profile.verificationStatus !== "APPROVED") {
      return { success: false, error: "Only approved sellers can request changes" }
    }
    if (profile.kycChangeRequestStatus === "REQUESTED") {
      return { success: false, error: "Change request already pending" }
    }
    if (profile.kycChangeRequestStatus === "ACCEPTED") {
      return { success: false, error: "Change request already accepted — update your KYC" }
    }

    await db.sellerProfile.update({
      where: { userId: session.user.id },
      data: { kycChangeRequestStatus: "REQUESTED", kycChangeRequestedAt: new Date() },
    })

    revalidatePath("/profile")
    return { success: true, message: "Change request submitted" }
  } catch {
    return { success: false, error: "Request failed. Please try again." }
  }
}
