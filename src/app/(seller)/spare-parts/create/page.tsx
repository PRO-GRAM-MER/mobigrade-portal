import { auth } from "@/auth";
import { redirect } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import CreateSparePartForm from "./CreateSparePartForm";

export const metadata = { title: "Create Spare Part — MobiGrade Portal" };

export default async function CreateSparePartPage() {
  const session = await auth();

  if (session!.user.verificationStatus !== "KYC_APPROVED") {
    redirect("/profile");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 flex flex-col gap-6">
      <PageHeader
        backHref="/spare-parts"
        title="Create Spare Part"
        subtitle="Manually list a single spare part for admin review"
      />
      <CreateSparePartForm />
    </div>
  );
}
