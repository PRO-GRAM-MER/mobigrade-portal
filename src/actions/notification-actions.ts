"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface NotificationRow {
  id:        string;
  type:      string;
  title:     string;
  message:   string;
  read:      boolean;
  createdAt: string;
  metadata:  Record<string, string> | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function requireUser() {
  const session = await auth();
  if (!session) throw new Error("Unauthenticated");
  return session.user.id as string;
}

// ─── Unread count (used by layout to badge the bell) ─────────────────────────

export async function getUnreadCountAction(): Promise<number> {
  try {
    const userId = await requireUser();
    return await prisma.notification.count({ where: { userId, read: false } });
  } catch {
    return 0;
  }
}

// ─── List recent notifications (fetched when bell panel opens) ────────────────

export async function listRecentNotificationsAction(
  limit = 15
): Promise<NotificationRow[]> {
  try {
    const userId = await requireUser();
    const rows = await prisma.notification.findMany({
      where:   { userId },
      orderBy: { createdAt: "desc" },
      take:    limit,
      select:  { id: true, type: true, title: true, message: true, read: true, createdAt: true, metadata: true },
    });
    return rows.map((n) => ({
      ...n,
      type:      n.type as string,
      createdAt: n.createdAt.toISOString(),
      metadata:  n.metadata as Record<string, string> | null,
    }));
  } catch {
    return [];
  }
}

// ─── Mark all as read ─────────────────────────────────────────────────────────

export async function markAllReadAction(): Promise<void> {
  try {
    const userId = await requireUser();
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data:  { read: true },
    });
    // Revalidate both layouts so bell badge refreshes
    revalidatePath("/dashboard");
    revalidatePath("/admin/dashboard");
  } catch {
    // silently ignore
  }
}

// ─── Mark one as read ─────────────────────────────────────────────────────────

export async function markReadAction(notificationId: string): Promise<void> {
  try {
    const userId = await requireUser();
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data:  { read: true },
    });
  } catch {
    // silently ignore
  }
}
