import { auth } from "@/auth";
import { redirect } from "next/navigation";

// Root "/" — redirect based on role, or to login if unauthenticated
export default async function RootPage() {
  const session = await auth();

  if (!session) redirect("/login");
  if (session.user.role === "ADMIN") redirect("/admin/dashboard");
  redirect("/dashboard");
}
