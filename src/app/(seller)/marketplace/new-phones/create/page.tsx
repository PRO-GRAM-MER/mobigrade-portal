import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { getAllBrands } from "@/features/phones/catalog-queries"
import { PhoneListingForm } from "@/features/phones/components/PhoneListingForm"

export const metadata: Metadata = { title: "Add Phone Listing" }

export default async function CreatePhoneListingPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== "SELLER") redirect("/admin/dashboard")

  const brands = await getAllBrands()

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
      <Link href="/marketplace/new-phones"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors group">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card shadow-sm group-hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </span>
        Back to Listings
      </Link>

      <div>
        <h1 className="text-[22px] font-bold text-foreground tracking-tight">Add Phone Listing</h1>
        <p className="text-[14px] text-muted-foreground mt-0.5">
          Select a phone from our catalog, choose your variant, set price and stock
        </p>
      </div>

      <PhoneListingForm brands={brands} />
    </div>
  )
}
