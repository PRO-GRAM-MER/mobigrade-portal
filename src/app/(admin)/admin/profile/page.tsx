import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminProfileClient from "./ProfileClient";

export const metadata = { title: "My Profile | MobiGrade Portal" };

export default async function AdminProfilePage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      fullName: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <AdminProfileClient
      fullName={user.fullName}
      email={user.email}
      avatarUrl={user.avatarUrl ?? null}
      joinedAt={user.createdAt.toISOString()}
    />
  );
}
