import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getUserById } from "@/features/profile/queries"
import { AvatarSection } from "@/features/profile/components/AvatarSection"
import { PasswordChangeForm } from "@/features/profile/components/PasswordChangeForm"

export const metadata: Metadata = { title: "Profile" }

export default async function AdminProfilePage() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") redirect("/admin/login")

  const user = await getUserById(session.user.id)
  if (!user) redirect("/admin/login")

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-[22px] font-bold text-foreground tracking-tight">My Profile</h1>
        <p className="text-[14px] text-muted-foreground mt-0.5">Manage your admin account</p>
      </div>

      {/* Upper card: Avatar | Change Password */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left: Avatar */}
          <div className="flex flex-col items-center justify-center gap-2 p-8 border-b md:border-b-0 md:border-r border-border">
            <AvatarSection user={user} />
          </div>

          {/* Right: Change Password */}
          <div className="p-6 sm:p-8">
            <h2 className="text-[15px] font-semibold text-foreground mb-5">Change Password</h2>
            <PasswordChangeForm />
          </div>
        </div>
      </div>
    </div>
  )
}
