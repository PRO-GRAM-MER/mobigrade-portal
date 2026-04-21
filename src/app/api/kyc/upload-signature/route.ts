import { auth } from "@/auth";
import { generateSignedUploadParams } from "@/lib/cloudinary";
import { NextResponse } from "next/server";

// GET /api/kyc/upload-signature
// Returns signed params so the client can upload directly to Cloudinary.
// Scoped per user — each seller's assets land in mobigrade/kyc/{userId}/

export async function GET() {
  const session = await auth();

  if (!session || session.user.role !== "SELLER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Block upload if KYC is approved, UNLESS the seller has an edit unlocked
  if (session.user.verificationStatus === "KYC_APPROVED") {
    const { prisma } = await import("@/lib/prisma");
    const kyc = await prisma.kycSubmission.findFirst({
      where: { sellerProfile: { userId: session.user.id } },
      select: { status: true },
    });
    if ((kyc?.status as string) !== "EDIT_UNLOCKED") {
      return NextResponse.json(
        { error: "KYC already approved — no further uploads allowed" },
        { status: 403 }
      );
    }
  }

  const params = generateSignedUploadParams(session.user.id);
  return NextResponse.json(params);
}
