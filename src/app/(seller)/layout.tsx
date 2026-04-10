import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SellerShell from "@/components/shells/SellerShell";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/admin/dashboard");

  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, read: false },
  });

  return (
    <SellerShell userName={session.user.name ?? ""} unreadCount={unreadCount}>
      {children}
    </SellerShell>
  );
}
