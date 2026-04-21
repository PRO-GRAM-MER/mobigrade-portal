import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Plus, Download } from "lucide-react"
import { auth } from "@/lib/auth"
import { getSellerSpareParts, getSellerPendingCSVCount } from "@/features/spare-parts/queries"
import { SellerInventoryPage } from "@/features/spare-parts/components/SellerInventoryPage"

export const metadata: Metadata = { title: "Spare Parts" }

export default async function SparePartsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== "SELLER") redirect("/admin/dashboard")

  const [parts, pendingCSVCount] = await Promise.all([
    getSellerSpareParts(session.user.id),
    getSellerPendingCSVCount(session.user.id),
  ])

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors group"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card shadow-sm group-hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </span>
        Back to Dashboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight">Spare Parts</h1>
          <p className="text-[14px] text-muted-foreground mt-0.5">Manage your spare parts inventory</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/spare-parts/sample"
            download="spare-parts-sample.csv"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-card text-foreground text-[13px] font-medium hover:bg-muted transition-colors"
          >
            <Download className="h-4 w-4" />
            Sample CSV
          </a>
          <Link
            href="/marketplace/spare-parts/create"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Manually
          </Link>
        </div>
      </div>

      <SellerInventoryPage
        parts={parts.map(p => ({
          ...p,
          price: Number(p.price),
          discountedPrice: Number(p.discountedPrice),
          createdAt: p.createdAt.toISOString(),
        }))}
        hasPendingUploads={pendingCSVCount > 0}
      />
    </div>
  )
}
