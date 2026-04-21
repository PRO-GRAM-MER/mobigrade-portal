import type { Metadata } from "next"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { getSellerForAdmin } from "@/features/onboarding/queries"
import { SellerDetailView } from "@/features/onboarding/components/SellerDetailView"

export const metadata: Metadata = { title: "Seller Details" }

interface PageProps {
  params: Promise<{ sellerId: string }>
}

export default async function SellerDetailPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect("/admin/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  const { sellerId } = await params
  const seller = await getSellerForAdmin(sellerId)
  if (!seller) notFound()

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
      {/* Back button */}
      <Link
        href="/admin/onboarding/sellers"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors group"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card shadow-sm group-hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </span>
        Back to Sellers
      </Link>

      {/* Page header */}
      <div>
        <h1 className="text-[22px] font-bold text-foreground tracking-tight">Seller Details</h1>
        <p className="text-[14px] text-muted-foreground mt-0.5">
          Review KYC information and take action
        </p>
      </div>

      <SellerDetailView seller={seller} />
    </div>
  )
}
