import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export const metadata: Metadata = { title: "Admin Dashboard" }

export default async function AdminDashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/admin/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <h1 className="text-[22px] font-bold text-foreground">Admin Dashboard</h1>
      <p className="text-muted-foreground mt-1 text-[14px]">Phase 2 — coming soon.</p>
    </div>
  )
}
