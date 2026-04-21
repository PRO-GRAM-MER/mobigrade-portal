"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import type { NotificationType } from "@/generated/prisma/client"

export async function createAdminNotifications(
  type: NotificationType,
  title: string,
  body: string,
  link?: string
) {
  const admins = await db.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  })
  if (admins.length === 0) return
  await db.notification.createMany({
    data: admins.map((a) => ({ userId: a.id, type, title, body, link: link ?? null })),
  })
}

export async function markNotificationReadAction(id: string) {
  const session = await auth()
  if (!session?.user?.id) return
  await db.notification.updateMany({
    where: { id, userId: session.user.id },
    data: { isRead: true },
  })
  revalidatePath("/admin/dashboard")
}

export async function markAllNotificationsReadAction() {
  const session = await auth()
  if (!session?.user?.id) return
  await db.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  })
  revalidatePath("/admin/dashboard")
}
