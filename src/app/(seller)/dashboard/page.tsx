import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = { title: "Dashboard — MobiGrade Portal" };

export default async function DashboardPage() {
  const session = await auth();
  const userId  = session!.user.id as string;

  // Resolve seller profile first
  const profile = await prisma.sellerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  const profileId = profile?.id;

  const [
    user,
    activeListings,
    pendingReview,
    totalOrderItems,
    earningsAgg,
    recentDraftsRaw,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, verificationStatus: true },
    }),

    profileId
      ? prisma.sellerProduct.count({
          where: {
            sellerProfileId: profileId,
            status: { in: ["ACTIVE", "ENRICHING", "LIVE"] },
          },
        })
      : 0,

    profileId
      ? prisma.catalogProductDraft.count({
          where: { sellerProfileId: profileId, status: "PENDING_REVIEW" },
        })
      : 0,

    profileId
      ? prisma.orderItem.count({ where: { sellerProfileId: profileId } })
      : 0,

    profileId
      ? prisma.sellerEarning.aggregate({
          where: { sellerProfileId: profileId },
          _sum: { netAmount: true },
        })
      : null,

    profileId
      ? prisma.catalogProductDraft.findMany({
          where: { sellerProfileId: profileId, status: "PENDING_REVIEW" },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: {
            id: true,
            partName: true,
            brand: true,
            modelName: true,
            condition: true,
            price: true,
            createdAt: true,
          },
        })
      : [],
  ]);

  const netEarnings  = Number(earningsAgg?._sum?.netAmount ?? 0);
  const recentDrafts = (recentDraftsRaw as typeof recentDraftsRaw).map(d => ({
    id:        d.id,
    partName:  d.partName,
    brand:     d.brand,
    modelName: d.modelName,
    condition: d.condition,
    price:     Number(d.price),
    createdAt: d.createdAt.toISOString(),
  }));

  return (
    <DashboardClient
      userName={user?.fullName ?? "Seller"}
      kycStatus={user?.verificationStatus ?? "KYC_PENDING"}
      activeListings={activeListings}
      pendingReview={pendingReview}
      totalOrderItems={totalOrderItems}
      netEarnings={netEarnings}
      recentDrafts={recentDrafts}
    />
  );
}
