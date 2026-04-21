import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { auth } from "@/lib/auth"
import { getBrandsWithModels } from "@/features/spare-parts/queries"
import { SparePartForm } from "@/features/spare-parts/components/SparePartForm"

export const metadata: Metadata = { title: "Create Spare Part" }

export default async function CreateSparePartPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  if (session.user.role !== "SELLER") redirect("/admin/dashboard")

  const brands = await getBrandsWithModels()

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
      {/* Back */}
      <Link
        href="/marketplace/spare-parts"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors group"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card shadow-sm group-hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </span>
        Back to Spare Parts
      </Link>

      {/* Page header */}
      <div>
        <h1 className="text-[22px] font-bold text-foreground tracking-tight">Create Spare Part</h1>
        <p className="text-[14px] text-muted-foreground mt-0.5">
          Fill in the details — your listing will be reviewed before going live
        </p>
      </div>

      <SparePartForm brands={brands} />
    </div>
  )
}
