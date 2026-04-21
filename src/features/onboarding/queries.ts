import { db } from "@/lib/db"
import type { VerificationStatus } from "@/types"

export type OnboardingSellerRow = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  createdAt: Date
  sellerProfile: {
    id: string
    verificationStatus: VerificationStatus
    businessName: string | null
    kycSubmittedAt: Date | null
    kycChangeRequestStatus: string
  } | null
}

export async function getOnboardingSellers({
  search,
  status,
}: {
  search?: string
  status?: string
}): Promise<OnboardingSellerRow[]> {
  return db.user.findMany({
    where: {
      role: "SELLER",
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
            ],
          }
        : {}),
      ...(status
        ? { sellerProfile: { verificationStatus: status as VerificationStatus } }
        : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      createdAt: true,
      sellerProfile: {
        select: {
          id: true,
          verificationStatus: true,
          businessName: true,
          kycSubmittedAt: true,
          kycChangeRequestStatus: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  }) as Promise<OnboardingSellerRow[]>
}

export async function getSellerForAdmin(userId: string) {
  return db.user.findUnique({
    where: { id: userId, role: "SELLER" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      avatarUrl: true,
      createdAt: true,
      sellerProfile: {
        select: {
          id: true,
          verificationStatus: true,
          businessName: true,
          gstNumber: true,
          aadhaarNumber: true,
          aadhaarImageUrl: true,
          panNumber: true,
          panImageUrl: true,
          address: true,
          city: true,
          state: true,
          pincode: true,
          kycSubmittedAt: true,
          kycRejectionReason: true,
          kycChangeRequestStatus: true,
          kycChangeRequestedAt: true,
        },
      },
    },
  })
}
