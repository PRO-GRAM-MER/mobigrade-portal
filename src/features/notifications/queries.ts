import { db } from "@/lib/db"

export async function getAdminNotifications(limit = 20) {
  return db.notification.findMany({
    where: { user: { role: "ADMIN" } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      link: true,
      isRead: true,
      createdAt: true,
      userId: true,
    },
  })
}

export async function getAdminUnreadCount(adminId: string) {
  return db.notification.count({
    where: { userId: adminId, isRead: false },
  })
}
