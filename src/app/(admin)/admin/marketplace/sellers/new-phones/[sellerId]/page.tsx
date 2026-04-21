import type { Metadata } from "next"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { getSellerListingsForAdmin } from "@/features/phones/admin-queries"
import { AdminSellerListingsPage } from "@/features/phones/components/AdminSellerListingsPage"

export const metadata: Metadata = { title: "Seller Phone Listings" }

interface PageProps {
  params: Promise<{ sellerId: string }>
}

export default async function AdminSellerPhoneListingsPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect("/admin/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  const { sellerId } = await params
  const data = await getSellerListingsForAdmin(sellerId)
  if (!data) notFound()

  const { seller, listings } = data

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
      <Link href="/admin/marketplace/sellers/new-phones"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors group">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card shadow-sm group-hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </span>
        Back to Sellers
      </Link>

      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-[20px] font-bold text-foreground tracking-tight">
              {seller.firstName} {seller.lastName}
            </h1>
            {seller.businessName && <p className="text-[14px] font-medium text-muted-foreground">{seller.businessName}</p>}
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-[13px] text-muted-foreground">{seller.email}</span>
              {seller.phone && <span className="text-[13px] text-muted-foreground">{seller.phone}</span>}
            </div>
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border flex-shrink-0
            ${seller.verificationStatus === "APPROVED" ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/25"
              : seller.verificationStatus === "UNDER_REVIEW" ? "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/25"
              : "bg-muted/60 text-muted-foreground border-border"}`}>
            KYC: {seller.verificationStatus.replace("_", " ")}
          </span>
        </div>
      </div>

      <AdminSellerListingsPage listings={listings} sellerId={sellerId} />
    </div>
  )
}
