import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { getOnboardingSellers } from "@/features/onboarding/queries"
import { SellerFilters } from "@/features/onboarding/components/SellerFilters"
import { SellersTable } from "@/features/onboarding/components/SellersTable"

export const metadata: Metadata = { title: "Onboarding — Sellers" }

interface PageProps {
  searchParams: Promise<{ search?: string; status?: string }>
}

async function SellersList({ search, status }: { search: string; status: string }) {
  const sellers = await getOnboardingSellers({ search: search || undefined, status: status || undefined })
  return <SellersTable sellers={sellers} />
}

export default async function OnboardingSellersPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect("/admin/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  const params = await searchParams
  const search = params.search ?? ""
  const status = params.status ?? ""

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Back button */}
      <Link
        href="/admin/dashboard"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors group"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card shadow-sm group-hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </span>
        Back to Dashboard
      </Link>

      {/* Page header */}
      <div>
        <h1 className="text-[22px] font-bold text-foreground tracking-tight">Seller Onboarding</h1>
        <p className="text-[14px] text-muted-foreground mt-0.5">
          Review and verify seller KYC submissions
        </p>
      </div>

      {/* Filters */}
      <Suspense>
        <SellerFilters />
      </Suspense>

      {/* Table card */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <Suspense
          fallback={
            <div className="p-8 text-center text-[13px] text-muted-foreground">Loading sellers…</div>
          }
        >
          <SellersList search={search} status={status} />
        </Suspense>
      </div>
    </div>
  )
}
