import { redirect } from "next/navigation";

// KYC is now handled on the Profile page.
export default function KycPage() {
  redirect("/profile");
}
