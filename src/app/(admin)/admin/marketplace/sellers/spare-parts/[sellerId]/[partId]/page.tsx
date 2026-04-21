import type { Metadata } from "next"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { getAdminSparePartDetail } from "@/features/spare-parts/admin-queries"
import { getBrandsWithModels } from "@/features/spare-parts/queries"
import { AdminSparePartDetail } from "@/features/spare-parts/components/AdminSparePartDetail"

export const metadata: Metadata = { title: "Spare Part Details" }

interface PageProps {
  params: Promise<{ sellerId: string; partId: string }>
}

export default async function AdminSparePartDetailPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect("/admin/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  const { sellerId, partId } = await params
  const [sparePart, brands] = await Promise.all([
    getAdminSparePartDetail(partId),
    getBrandsWithModels(),
  ])
  if (!sparePart) notFound()

  const serialized = {
    ...sparePart,
    price: Number(sparePart.price),
    discountedPrice: Number(sparePart.discountedPrice),
    enrichedAt: sparePart.enrichedAt ?? null,
    deployedAt: sparePart.deployedAt ?? null,
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
      <Link
        href={`/admin/marketplace/sellers/spare-parts/${sellerId}`}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors group"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card shadow-sm group-hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </span>
        Back to Seller Parts
      </Link>

      <div>
        <h1 className="text-[22px] font-bold text-foreground tracking-tight">Spare Part Details</h1>
        <p className="text-[14px] text-muted-foreground mt-0.5">
          Review, edit, and manage this listing
        </p>
      </div>

      <AdminSparePartDetail sparePart={serialized} brands={brands} />
    </div>
  )
}
