import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getUserById } from "@/features/profile/queries"
import { Header } from "@/components/shared/Header"
import { SellerSidebar } from "@/components/shared/SellerSidebar"
import { SidebarInset } from "@/components/shared/SidebarInset"

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await getUserById(session.user.id)
  if (!user) redirect("/login")

  const sidebarUser = {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    avatarUrl: user.avatarUrl,
  }

  return (
    <div className="min-h-dvh bg-background">
      <Header role="SELLER" />
      <SellerSidebar user={sidebarUser} />
      <SidebarInset>{children}</SidebarInset>
    </div>
  )
}
