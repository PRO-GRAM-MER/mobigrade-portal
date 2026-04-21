import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { getAdminSellersList } from "@/features/spare-parts/admin-queries"
import { AdminSellersSparePartsTable } from "@/features/spare-parts/components/AdminSellersSparePartsTable"

export const metadata: Metadata = { title: "Sellers — Spare Parts" }

export default async function AdminSellerSparePartsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/admin/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  const sellers = await getAdminSellersList()

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
      <Link
        href="/admin/dashboard"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors group"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card shadow-sm group-hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </span>
        Back to Dashboard
      </Link>

      <div>
        <h1 className="text-[22px] font-bold text-foreground tracking-tight">Sellers — Spare Parts</h1>
        <p className="text-[14px] text-muted-foreground mt-0.5">
          Review spare part listings submitted by sellers
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <AdminSellersSparePartsTable sellers={sellers} />
      </div>
    </div>
  )
}
