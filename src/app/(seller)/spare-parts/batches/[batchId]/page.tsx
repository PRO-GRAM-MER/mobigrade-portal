import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { getBatchDetailAction } from "@/actions/catalog-actions";
import PageHeader from "@/components/shared/PageHeader";
import BatchDetail from "./BatchDetail";

interface Props {
  params: Promise<{ batchId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { batchId } = await params;
  const result = await getBatchDetailAction(batchId);
  return {
    title: result.success
      ? `${result.data.filename} — MobiGrade Portal`
      : "Batch Details — MobiGrade Portal",
  };
}

export default async function BatchDetailPage({ params }: Props) {
  const session = await auth();

  if (session!.user.verificationStatus !== "KYC_APPROVED") {
    redirect("/profile");
  }

  const { batchId } = await params;
  const result = await getBatchDetailAction(batchId);

  if (!result.success) notFound();

  const { data: batch } = result;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col gap-6">
      <PageHeader
        backHref="/spare-parts"
        title={batch.filename}
        subtitle={`${batch.totalRows} row${batch.totalRows !== 1 ? "s" : ""} · uploaded batch`}
      />

      <BatchDetail batch={batch} />
    </div>
  );
}
