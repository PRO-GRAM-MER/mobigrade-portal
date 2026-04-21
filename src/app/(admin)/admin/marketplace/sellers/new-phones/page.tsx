import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { getAdminListingSellersList } from "@/features/phones/admin-queries"
import { AdminPhoneSellersList } from "@/features/phones/components/AdminPhoneSellersList"

export const metadata: Metadata = { title: "Sellers — New Phones" }

export default async function AdminNewPhoneSellersPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/admin/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  const sellers = await getAdminListingSellersList()

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
      <Link href="/admin/dashboard"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors group">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card shadow-sm group-hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </span>
        Back to Dashboard
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight">Sellers — New Phones</h1>
          <p className="text-[14px] text-muted-foreground mt-0.5">Review phone listings submitted by sellers</p>
        </div>
        <Link href="/admin/catalog/phones"
          className="inline-flex items-center h-9 px-4 text-[13px] font-semibold rounded-xl border border-border bg-card hover:bg-muted transition-colors flex-shrink-0">
          Manage Catalog
        </Link>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <AdminPhoneSellersList sellers={sellers} />
      </div>
    </div>
  )
}
