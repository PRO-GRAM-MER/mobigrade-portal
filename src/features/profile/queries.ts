import { db } from "@/lib/db"

export async function getSellerProfileByUserId(userId: string) {
  return db.sellerProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      verificationStatus: true,
      businessName: true,
      gstNumber: true,
      aadhaarNumber: true,
      aadhaarImageUrl: true,
      panNumber: true,
      panImageUrl: true,
      kycRejectionReason: true,
      kycChangeRequestStatus: true,
      kycChangeRequestedAt: true,
    },
  })
}

export async function getUserById(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      avatarUrl: true,
    },
  })
}
