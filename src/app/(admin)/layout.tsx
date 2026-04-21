import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getUserById } from "@/features/profile/queries"
import { Header } from "@/components/shared/Header"
import { AdminSidebar } from "@/components/shared/AdminSidebar"
import { SidebarInset } from "@/components/shared/SidebarInset"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/admin/login")

  const user = await getUserById(session.user.id)
  if (!user) redirect("/admin/login")

  const sidebarUser = {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    avatarUrl: user.avatarUrl,
  }

  return (
    <div className="min-h-dvh bg-background">
      <Header role="ADMIN" />
      <AdminSidebar user={sidebarUser} />
      <SidebarInset>{children}</SidebarInset>
    </div>
  )
}
