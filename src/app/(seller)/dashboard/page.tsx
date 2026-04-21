<<<<<<< HEAD
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ShieldAlert, ArrowRight } from "lucide-react"
import { auth } from "@/lib/auth"
import { getSellerProfileByUserId } from "@/features/profile/queries"

export const metadata: Metadata = { title: "Dashboard" }

export default async function SellerDashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== "SELLER") redirect("/admin/dashboard")

  const profile = await getSellerProfileByUserId(session.user.id)
  const kycPending = !profile || profile.verificationStatus === "PENDING"

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">

      {/* KYC Banner */}
      {kycPending && (
        <Link
          href="/profile"
          className="group flex items-center gap-4 p-4 mb-6 rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/15 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-amber-800 dark:text-amber-300">
              Complete your KYC verification
            </p>
            <p className="text-[12px] text-amber-700 dark:text-amber-400 mt-0.5">
              Submit your business details to start trading on MobiGrade
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      <h1 className="text-[22px] font-bold text-foreground">Seller Dashboard</h1>
      <p className="text-muted-foreground mt-1 text-[14px]">Phase 2 — coming soon.</p>
    </div>
  )
=======
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
>>>>>>> 607b0b216c834b27ddb27ee7dbf87bdd6a4e98c8
}
