"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteCloudinaryAsset } from "@/lib/cloudinary";
import { kycSchema, type KycInput } from "@/lib/validations/kyc";
import type { KycStatus, KycDocumentType, VerificationStatus } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionResult =
  | { success: true }
  | { success: false; error?: string; fieldErrors?: Record<string, string[]> };

// ─── submitKycAction ──────────────────────────────────────────────────────────
// Validates + upserts KycSubmission, advances User.verificationStatus.
// Safe to call on first submission AND re-submission after rejection.

export async function submitKycAction(data: KycInput): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "SELLER") {
    return { success: false, error: "Unauthorized" };
  }

  // ── 1. Guard: allow from pending, rejected, or admin-unlocked edit ──────────
  const allowedStatuses: VerificationStatus[] = ["KYC_PENDING", "KYC_REJECTED", "KYC_APPROVED"];
  if (!allowedStatuses.includes(session.user.verificationStatus)) {
    return {
      success: false,
      error: "KYC has already been submitted and cannot be changed right now.",
    };
  }

  // For APPROVED sellers, only allow if KYC submission is EDIT_UNLOCKED
  if (session.user.verificationStatus === "KYC_APPROVED") {
    const kycStatus = await prisma.kycSubmission.findFirst({
      where: { sellerProfile: { userId: session.user.id } },
      select: { status: true },
    });
    if ((kycStatus?.status as string) !== "EDIT_UNLOCKED") {
      return {
        success: false,
        error: "Request admin approval before editing your approved KYC.",
      };
    }
  }

  // ── 2. Validate ───────────────────────────────────────────────────────────
  const parsed = kycSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // ── 3. Fetch seller profile ───────────────────────────────────────────────
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      sellerProfile: {
        select: {
          id: true,
          kycSubmission: {
            select: {
              aadhaarPublicId: true,
              panPublicId: true,
            },
          },
        },
      },
    },
  });

  if (!user?.sellerProfile) {
    return { success: false, error: "Seller profile not found." };
  }

  const { id: sellerProfileId, kycSubmission: existing } = user.sellerProfile;

  // ── 4. Clean up old Cloudinary assets on re-submission ───────────────────
  if (existing) {
    const cleanupIds = [existing.aadhaarPublicId, existing.panPublicId].filter(
      Boolean
    ) as string[];
    await Promise.allSettled(cleanupIds.map(deleteCloudinaryAsset));
  }

  // ── 5. Build upsert payload ───────────────────────────────────────────────
  const d = parsed.data;

  // Determine document type: if only GST provided (no aadhaar) → GST, else AADHAAR_PAN
  const documentType: KycDocumentType =
    d.gstNumber && !d.aadhaarNumber ? "GST" : "AADHAAR_PAN";

  const submissionPayload = {
    documentType,
    gstNumber:       d.gstNumber   ?? null,
    aadhaarNumber:   d.aadhaarNumber ?? null,
    aadhaarImageUrl: d.aadhaarImageUrl ?? null,
    aadhaarPublicId: d.aadhaarPublicId ?? null,
    panNumber:       d.panNumber   ?? null,
    panImageUrl:     d.panImageUrl  ?? null,
    panPublicId:     d.panPublicId  ?? null,
  };

  // ── 6. Upsert submission + update user status + notify admins ─────────────
  const seller = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { fullName: true },
  });
  const sellerName = seller?.fullName ?? "A seller";

  const adminUsers = await prisma.user.findMany({
    where:  { role: "ADMIN" },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.kycSubmission.upsert({
      where: { sellerProfileId },
      create: {
        sellerProfileId,
        ...submissionPayload,
        status: "SUBMITTED",
      },
      update: {
        ...submissionPayload,
        status: "SUBMITTED",
        rejectionReason: null,
        reviewedAt: null,
        reviewedById: null,
      },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { verificationStatus: "KYC_SUBMITTED" },
    }),
    ...adminUsers.map((admin) =>
      prisma.notification.create({
        data: {
          userId:  admin.id,
          type:    "KYC_SUBMITTED",
          title:   "New KYC submission",
          message: `${sellerName} has submitted their KYC documents for review.`,
          metadata: { sellerUserId: session.user.id },
        },
      })
    ),
  ]);

  return { success: true };
}

// ─── getKycSubmissionAction ───────────────────────────────────────────────────
// Server component helper — returns current KYC state for the logged-in seller.

export async function getKycSubmissionAction() {
  const session = await auth();
  if (!session) return null;

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      kycSubmission: {
        select: {
          gstNumber: true,
          aadhaarNumber: true,
          aadhaarImageUrl: true,
          panNumber: true,
          panImageUrl: true,
          status: true,
          rejectionReason: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  return profile?.kycSubmission ?? null;
}

// ─── updateKycStatusAction ────────────────────────────────────────────────────
// Called by the ADMIN app (Phase 5). Transitions KycSubmission status and
// syncs User.verificationStatus in one atomic operation.

const KYC_TO_VERIFICATION: Record<KycStatus, VerificationStatus> = {
  SUBMITTED:      "KYC_SUBMITTED",
  UNDER_REVIEW:   "KYC_UNDER_REVIEW",
  APPROVED:       "KYC_APPROVED",
  REJECTED:       "KYC_REJECTED",
  EDIT_REQUESTED: "KYC_APPROVED",   // still approved while edit is requested
  EDIT_UNLOCKED:  "KYC_APPROVED",   // still approved while edit is in progress
};

export async function updateKycStatusAction(
  kycSubmissionId: string,
  newStatus: KycStatus,
  rejectionReason?: string
): Promise<ActionResult> {
  const session = await auth();
  // This action is admin-only — the admin app will call it with its own auth
  if (!session || session.user.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  if (newStatus === "REJECTED" && !rejectionReason?.trim()) {
    return { success: false, error: "Rejection reason is required." };
  }

  const submission = await prisma.kycSubmission.findUnique({
    where: { id: kycSubmissionId },
    select: {
      status: true,
      sellerProfile: { select: { userId: true } },
    },
  });

  if (!submission) {
    return { success: false, error: "KYC submission not found." };
  }

  // ── Status transition guard ───────────────────────────────────────────────
  const validTransitions: Record<KycStatus, KycStatus[]> = {
    SUBMITTED:      ["UNDER_REVIEW", "APPROVED", "REJECTED"],
    UNDER_REVIEW:   ["APPROVED", "REJECTED"],
    APPROVED:       ["EDIT_REQUESTED"],
    REJECTED:       [],                // Terminal — seller must re-submit
    EDIT_REQUESTED: ["EDIT_UNLOCKED"],
    EDIT_UNLOCKED:  ["SUBMITTED"],     // Seller re-submits → goes back to SUBMITTED
  };

  if (!validTransitions[submission.status].includes(newStatus)) {
    return {
      success: false,
      error: `Cannot transition from ${submission.status} to ${newStatus}.`,
    };
  }

  await prisma.$transaction([
    prisma.kycSubmission.update({
      where: { id: kycSubmissionId },
      data: {
        status: newStatus,
        rejectionReason: newStatus === "REJECTED" ? rejectionReason : null,
        reviewedAt: new Date(),
        reviewedById: session.user.id,
      },
    }),
    prisma.user.update({
      where: { id: submission.sellerProfile.userId },
      data: { verificationStatus: KYC_TO_VERIFICATION[newStatus] },
    }),
  ]);

  return { success: true };
}
