import { auth } from "@/lib/auth"
import { HeaderClient } from "./HeaderClient"
import { getAdminNotifications, getAdminUnreadCount } from "@/features/notifications/queries"

interface HeaderProps {
  role: "ADMIN" | "SELLER"
}

export async function Header({ role }: HeaderProps) {
  const session = await auth()
  const u = session?.user
  if (!u?.email) return null

  const user = {
    id: u.id ?? "",
    email: u.email,
    firstName: u.firstName ?? "",
    lastName: u.lastName ?? "",
    phone: u.phone,
    role: (u.role ?? role) as "ADMIN" | "SELLER",
    avatarUrl: u.avatarUrl,
  }

  let notifications: Awaited<ReturnType<typeof getAdminNotifications>> = []
  let unreadCount = 0
  if (role === "ADMIN" && u.id) {
    ;[notifications, unreadCount] = await Promise.all([
      getAdminNotifications(20),
      getAdminUnreadCount(u.id),
    ])
  }

  return (
    <HeaderClient
      user={user}
      role={role}
      notifications={notifications.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() }))}
      unreadCount={unreadCount}
    />
  )
}
