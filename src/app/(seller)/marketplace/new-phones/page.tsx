import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus } from "lucide-react"
import { auth } from "@/lib/auth"
import { getSellerListings, hasPendingCSVListings } from "@/features/phones/seller-queries"
import { SellerPhoneListingsPage } from "@/features/phones/components/SellerPhoneListingsPage"

export const metadata: Metadata = { title: "New Phones" }

export default async function NewPhonesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== "SELLER") redirect("/admin/dashboard")

  const [listings, hasPending] = await Promise.all([
    getSellerListings(session.user.id),
    hasPendingCSVListings(session.user.id),
  ])

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight">New Phones</h1>
          <p className="text-[14px] text-muted-foreground mt-0.5">
            List new phone inventory — choose from our catalog, set your price and stock
          </p>
        </div>
        <Link href="/marketplace/new-phones/create"
          className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold rounded-xl
            bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex-shrink-0">
          <Plus className="h-4 w-4" /> Add Listing
        </Link>
      </div>
      <SellerPhoneListingsPage listings={listings} hasPendingUploads={hasPending} />
    </div>
  )
}
