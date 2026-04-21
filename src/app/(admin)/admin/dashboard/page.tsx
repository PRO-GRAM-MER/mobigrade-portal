<<<<<<< HEAD
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export const metadata: Metadata = { title: "Admin Dashboard" }

export default async function AdminDashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/admin/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <h1 className="text-[22px] font-bold text-foreground">Admin Dashboard</h1>
      <p className="text-muted-foreground mt-1 text-[14px]">Phase 2 — coming soon.</p>
    </div>
  )
=======
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
>>>>>>> 607b0b216c834b27ddb27ee7dbf87bdd6a4e98c8
}
