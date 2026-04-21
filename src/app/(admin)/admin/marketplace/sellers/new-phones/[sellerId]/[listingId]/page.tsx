import type { Metadata } from "next"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { getAdminListingDetail } from "@/features/phones/admin-queries"
import { AdminListingDetail } from "@/features/phones/components/AdminListingDetail"

export const metadata: Metadata = { title: "Phone Listing Details" }

interface PageProps {
  params: Promise<{ sellerId: string; listingId: string }>
}

export default async function AdminListingDetailPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect("/admin/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  const { sellerId, listingId } = await params
  const listing = await getAdminListingDetail(listingId)
  if (!listing) notFound()

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
      <Link href={`/admin/marketplace/sellers/new-phones/${sellerId}`}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors group">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card shadow-sm group-hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </span>
        Back to Seller Listings
      </Link>

      <div>
        <h1 className="text-[22px] font-bold text-foreground tracking-tight">Listing Details</h1>
        <p className="text-[14px] text-muted-foreground mt-0.5">Review and manage this seller listing</p>
      </div>

      <AdminListingDetail listing={listing} sellerId={sellerId} />
    </div>
  )
}
