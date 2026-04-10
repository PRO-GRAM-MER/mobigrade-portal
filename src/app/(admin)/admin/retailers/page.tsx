import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { Clock, CheckCircle2, XCircle, AlertCircle, Store } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { RetailersFilter } from "./RetailersFilter";
import classes from "./retailers.module.css";

export const metadata: Metadata = { title: "Retailers — MobiGrade Portal" };

type VerificationStatus = "KYC_PENDING" | "KYC_SUBMITTED" | "KYC_UNDER_REVIEW" | "KYC_APPROVED" | "KYC_REJECTED" | "SUSPENDED";

const STATUS_CFG: Record<VerificationStatus, { label: string; bg: string; color: string; Icon: React.ElementType }> = {
  KYC_PENDING:      { label: "Pending",   bg: "#FFF4E5", color: "#FF9500", Icon: Clock        },
  KYC_SUBMITTED:    { label: "Submitted", bg: "#E6F0FF", color: "#1E56D9", Icon: Clock        },
  KYC_UNDER_REVIEW: { label: "Reviewing", bg: "#EEF2FF", color: "#6366F1", Icon: Clock        },
  KYC_APPROVED:     { label: "Verified",  bg: "#E6F7EF", color: "#00A167", Icon: CheckCircle2 },
  KYC_REJECTED:     { label: "Rejected",  bg: "#FDECEA", color: "#D92D20", Icon: XCircle      },
  SUSPENDED:        { label: "Suspended", bg: "#F5F5F5", color: "#888888", Icon: AlertCircle  },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status as VerificationStatus];
  if (!cfg) return <span style={{ color: "var(--color-muted-foreground)" }}>{status}</span>;
  return (
    <span className={classes.statusPill} style={{ backgroundColor: cfg.bg, color: cfg.color }}>
      <cfg.Icon size={12} />{cfg.label}
    </span>
  );
}

function SkeletonRows() {
  return Array.from({ length: 6 }).map((_, i) => (
    <tr key={i} className={classes.skeletonRow}>
      {Array.from({ length: 5 }).map((__, j) => (
        <td key={j}><div className={classes.skeletonCell} style={{ width: j === 4 ? 70 : "80%" }} /></td>
      ))}
    </tr>
  ));
}

async function RetailersTable({ search, status }: { search: string; status: string }) {
  const retailers = await prisma.user.findMany({
    where: {
      role: "RETAILER",
      ...(status ? { verificationStatus: status as VerificationStatus } : {}),
      ...(search ? {
        OR: [
          { email:  { contains: search, mode: "insensitive" } },
          { mobile: { contains: search } },
        ],
      } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      fullName: true,
      email: true,
      mobile: true,
      verificationStatus: true,
      createdAt: true,
      retailerProfile: {
        select: {
          businessName: true,
          _count: { select: { orders: true } },
        },
      },
    },
  });

  if (retailers.length === 0) {
    return (
      <div className={classes.tableCard}>
        <div className={classes.empty}>
          <Store size={32} style={{ opacity: 0.25 }} />
          <span>No retailers found{search || status ? " for the selected filters" : ""}.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={classes.tableCard}>
      <table className={classes.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Orders</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {retailers.map(r => (
            <tr key={r.id}>
              <td>
                <p className={classes.tdName}>{r.fullName}</p>
                <p className={classes.tdSub}>{r.retailerProfile?.businessName ?? "No business name"}</p>
              </td>
              <td>{r.email}</td>
              <td>{r.mobile}</td>
              <td style={{ fontWeight: 600, color: "var(--color-primary)" }}>
                {r.retailerProfile?._count.orders ?? 0}
              </td>
              <td><StatusPill status={r.verificationStatus} /></td>
              <td>
                <Link href={`/admin/retailers/${r.id}`} className={classes.viewBtn}>
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function RetailersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const { search = "", status = "" } = await searchParams;

  return (
    <div className={classes.page}>
      <PageHeader backHref="/admin/dashboard" title="Retailers" />
      <Suspense fallback={null}>
        <RetailersFilter />
      </Suspense>
      <Suspense
        fallback={
          <div className={classes.tableCard}>
            <table className={classes.table}>
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Orders</th><th>Status</th><th></th></tr></thead>
              <tbody><SkeletonRows /></tbody>
            </table>
          </div>
        }
      >
        <RetailersTable search={search} status={status} />
      </Suspense>
    </div>
  );
}
