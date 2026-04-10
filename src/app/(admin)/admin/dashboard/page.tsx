import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = { title: "Admin Dashboard — MobiGrade" };

export default async function AdminDashboardPage() {
  const [
    sellersOnboard,
    retailers,
    totalOrders,
    totalReturns,
    pendingKyc,
    pendingReview,
    recentDraftsRaw,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "SELLER" } }),
    prisma.retailerProfile.count(),
    prisma.order.count(),
    prisma.returnRequest.count(),
    prisma.kycSubmission.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.catalogProductDraft.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.catalogProductDraft.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        partName: true,
        brand: true,
        modelName: true,
        condition: true,
        price: true,
        createdAt: true,
        sellerProfile: { select: { user: { select: { fullName: true } } } },
      },
    }),
  ]);

  const recentDrafts = recentDraftsRaw.map((d) => ({
    id: d.id,
    partName: d.partName,
    brand: d.brand,
    modelName: d.modelName,
    condition: d.condition,
    price: Number(d.price),
    createdAt: d.createdAt.toISOString(),
    sellerName: d.sellerProfile.user.fullName,
  }));

  return (
    <DashboardClient
      sellersOnboard={sellersOnboard}
      retailers={retailers}
      totalOrders={totalOrders}
      totalReturns={totalReturns}
      pendingKyc={pendingKyc}
      pendingReview={pendingReview}
      recentDrafts={recentDrafts}
    />
  );
}
