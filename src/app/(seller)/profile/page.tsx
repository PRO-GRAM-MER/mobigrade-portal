import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProfileClient from "./ProfileClient";

export const metadata = { title: "My Profile | MobiGrade" };

export default async function SellerProfilePage() {
  const session = await auth();
  if (!session || session.user.role !== "SELLER") redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      mobile: true,
      avatarUrl: true,
      createdAt: true,
      sellerProfile: {
        select: {
          kycSubmission: {
            select: {
              status: true,
              gstNumber: true,
              aadhaarNumber: true,
              aadhaarImageUrl: true,
              panNumber: true,
              panImageUrl: true,
              rejectionReason: true,
            },
          },
        },
      },
    },
  });

  if (!user) redirect("/login");

  const kyc = user.sellerProfile?.kycSubmission ?? null;

  return (
    <ProfileClient
      userId={user.id}
      fullName={user.fullName}
      email={user.email}
      mobile={user.mobile ?? ""}
      avatarUrl={user.avatarUrl ?? null}
      joinedAt={user.createdAt.toISOString()}
      kyc={kyc}
    />
  );
}
