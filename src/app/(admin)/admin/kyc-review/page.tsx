import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";
import type { KycStatus } from "@prisma/client";
import { ArrowRight, FileSearch } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import s from "../admin.module.css";

export const metadata: Metadata = { title: "KYC Review — MobiGrade Portal" };

const STATUS_TABS: { value: KycStatus | "ALL"; label: string }[] = [
  { value: "ALL",          label: "All" },
  { value: "SUBMITTED",    label: "Submitted" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "APPROVED",     label: "Approved" },
  { value: "REJECTED",     label: "Rejected" },
];

const KYC_COLOR: Record<KycStatus, string> = {
  SUBMITTED:      "blue",
  UNDER_REVIEW:   "yellow",
  APPROVED:       "green",
  REJECTED:       "red",
  EDIT_REQUESTED: "yellow",
  EDIT_UNLOCKED:  "neutral",
};

const PAGE_SIZE = 25;

export default async function KycReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status, page } = await searchParams;
  const currentPage  = Math.max(1, parseInt(page ?? "1", 10));
  const statusFilter = STATUS_TABS.find((t) => t.value === status)?.value ?? "ALL";
  const where        = statusFilter !== "ALL" ? { status: statusFilter as KycStatus } : {};

  const [submissions, total] = await Promise.all([
    prisma.kycSubmission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        sellerProfile: {
          include: { user: { select: { fullName: true, email: true, mobile: true } } },
        },
      },
    }),
    prisma.kycSubmission.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const baseQuery  = statusFilter !== "ALL" ? `status=${statusFilter}&` : "";

  return (
    <div className={s.page}>
      <PageHeader
        backHref="/admin/dashboard"
        title="KYC Review"
        subtitle={`${total} submission${total !== 1 ? "s" : ""}`}
      />

      {/* Status tabs */}
      <div className={s.tabs}>
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/kyc-review${tab.value !== "ALL" ? `?status=${tab.value}` : ""}`}
            className={`${s.tab} ${statusFilter === tab.value ? s["tab--active"] : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {submissions.length === 0 ? (
        <div className={s.tableCard}>
          <div className={s.empty}>
            <FileSearch size={28} style={{ opacity: 0.3 }} />
            <span>No KYC submissions found.</span>
          </div>
        </div>
      ) : (
        <>
          <div className={s.tableCard}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Seller</th>
                  <th>Contact</th>
                  <th>GST No.</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((kyc) => (
                  <tr key={kyc.id}>
                    <td>
                      <p className={s.tdPrimary}>{kyc.sellerProfile.user.fullName}</p>
                    </td>
                    <td>
                      <p style={{ fontSize: "0.8125rem" }}>{kyc.sellerProfile.user.email}</p>
                      <p className={s.tdSub}>{kyc.sellerProfile.user.mobile}</p>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}>
                        {kyc.gstNumber ?? "—"}
                      </span>
                    </td>
                    <td>
                      <span className={`${s.badge} ${s[`badge--${KYC_COLOR[kyc.status]}`]}`}>
                        {kyc.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td style={{ color: "var(--color-muted-foreground)", fontSize: "0.8rem" }}>
                      {new Date(kyc.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td>
                      <Link href={`/admin/kyc-review/${kyc.id}`} className={s.actionBtn}>
                        Review <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={s.pagination}>
              <span className={s.paginationInfo}>
                Page {currentPage} of {totalPages} · {total} total
              </span>
              <div className={s.paginationControls}>
                {currentPage > 1 && (
                  <Link href={`/admin/kyc-review?${baseQuery}page=${currentPage - 1}`} className={s.pageBtn}>
                    ← Prev
                  </Link>
                )}
                {currentPage < totalPages && (
                  <Link href={`/admin/kyc-review?${baseQuery}page=${currentPage + 1}`} className={s.pageBtn}>
                    Next →
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
