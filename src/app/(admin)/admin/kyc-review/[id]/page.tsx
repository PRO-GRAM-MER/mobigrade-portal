import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PageHeader from "@/components/shared/PageHeader";
import KycReviewActions from "./KycReviewActions";
import DocImage from "./DocImage";
import s from "../../admin.module.css";

export const metadata: Metadata = { title: "KYC Detail — MobiGrade Portal" };

const KYC_COLOR: Record<string, string> = {
  SUBMITTED:    "blue",
  UNDER_REVIEW: "yellow",
  APPROVED:     "green",
  REJECTED:     "red",
};


export default async function KycDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const kyc = await prisma.kycSubmission.findUnique({
    where: { id },
    include: {
      sellerProfile: {
        include: {
          user: { select: { fullName: true, email: true, mobile: true, createdAt: true } },
        },
      },
    },
  });
  if (!kyc) notFound();

  const isPending = kyc.status === "SUBMITTED" || kyc.status === "UNDER_REVIEW";

  return (
    <div className={s.page}>
      {/* Header */}
      <PageHeader
        backHref="/admin/kyc-review"
        title={kyc.sellerProfile.user.fullName}
        subtitle={`${kyc.sellerProfile.user.email} · ${kyc.sellerProfile.user.mobile}`}
        right={
          <span className={`${s.badge} ${s["badge--lg"]} ${s[`badge--${KYC_COLOR[kyc.status]}`]}`}>
            {kyc.status.replace(/_/g, " ")}
          </span>
        }
      />

      {/* Detail cards */}
      <div className={s.detailGrid}>
        <div className={s.detailCard}>
          <div className={s.detailCardHead}>
            <p className={s.detailCardTitle}>Seller Info</p>
          </div>
          <div className={s.detailCardBody}>
            <dl className={s.detailList}>
              <dt>Name</dt>       <dd>{kyc.sellerProfile.user.fullName}</dd>
              <dt>Email</dt>      <dd>{kyc.sellerProfile.user.email}</dd>
              <dt>Mobile</dt>     <dd>{kyc.sellerProfile.user.mobile}</dd>
              <dt>Registered</dt> <dd>{new Date(kyc.sellerProfile.user.createdAt).toLocaleDateString("en-IN")}</dd>
            </dl>
          </div>
        </div>

        <div className={s.detailCard}>
          <div className={s.detailCardHead}>
            <p className={s.detailCardTitle}>Documents</p>
          </div>
          <div className={s.detailCardBody}>
            <dl className={s.detailList}>
              <dt>Doc Type</dt>    <dd>{(kyc as any).documentType?.replace("_", " + ") ?? "—"}</dd>
              <dt>GST Number</dt>  <dd>{kyc.gstNumber ?? "—"}</dd>
              <dt>Aadhaar No.</dt> <dd>{kyc.aadhaarNumber ?? "—"}</dd>
              <dt>PAN No.</dt>     <dd>{kyc.panNumber ?? "—"}</dd>
              <dt>Submitted</dt>   <dd>{new Date(kyc.createdAt).toLocaleDateString("en-IN")}</dd>
            </dl>
          </div>
        </div>
      </div>

      {/* Document images */}
      {(kyc.aadhaarImageUrl || kyc.panImageUrl) && (
        <div className={`${s.detailCard} ${s["detailCard--full"]}`}>
          <div className={s.detailCardHead}>
            <p className={s.detailCardTitle}>Document Images</p>
          </div>
          <div className={s.docImages}>
            {kyc.aadhaarImageUrl && (
              <DocImage src={kyc.aadhaarImageUrl} label="Aadhaar" />
            )}
            {kyc.panImageUrl && (
              <DocImage src={kyc.panImageUrl} label="PAN Card" />
            )}
          </div>
        </div>
      )}

      {/* Rejection reason (if already rejected) */}
      {kyc.status === "REJECTED" && kyc.rejectionReason && (
        <div className={`${s.alert} ${s["alert--error"]}`}>
          <strong>Rejection reason:</strong>&nbsp;{kyc.rejectionReason}
        </div>
      )}

      {/* Interactive review actions */}
      {isPending && <KycReviewActions kycId={kyc.id} />}
    </div>
  );
}
