import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  listAllBatchesAction,
  listManualDraftsAction,
} from "@/actions/catalog-actions";
import SparePartsClientShell from "./SparePartsClientShell";

export const metadata = { title: "Spare Parts — MobiGrade Portal" };

export default async function SparePartsPage() {
  const session = await auth();

  if (session!.user.verificationStatus !== "KYC_APPROVED") {
    redirect("/profile");
  }

  const [batchesResult, draftsResult] = await Promise.all([
    listAllBatchesAction(),
    listManualDraftsAction(1),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col gap-6">
      <SparePartsClientShell
        batches={batchesResult.success ? batchesResult.data : []}
        manualDrafts={draftsResult.success ? draftsResult.data.drafts : []}
        manualTotal={draftsResult.success ? draftsResult.data.total : 0}
      />
    </div>
  );
}
