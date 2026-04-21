import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import {
  Clock, CheckCircle2, XCircle, RefreshCw, AlertCircle, Users,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { SellersFilter } from "./SellersFilter";
import classes from "./sellers.module.css";
import s from "../admin.module.css";

export const metadata: Metadata = { title: "Sellers — MobiGrade Portal" };

/* ── Status display config ──────────────────────────────────────────────── */
type VerificationStatus =
  | "KYC_PENDING"
  | "KYC_SUBMITTED"
  | "KYC_UNDER_REVIEW"
  | "KYC_APPROVED"
  | "KYC_REJECTED"
  | "SUSPENDED";

const STATUS_CFG: Record<
  VerificationStatus,
  { label: string; bg: string; color: string; Icon: React.ElementType }
> = {
  KYC_PENDING:      { label: "Pending",      bg: "#FFF4E5", color: "#FF9500",  Icon: Clock         },
  KYC_SUBMITTED:    { label: "Submitted",    bg: "#E6F0FF", color: "#1E56D9",  Icon: RefreshCw     },
  KYC_UNDER_REVIEW: { label: "Under Review", bg: "#EEF2FF", color: "#6366F1",  Icon: RefreshCw     },
  KYC_APPROVED:     { label: "Verified",     bg: "#E6F7EF", color: "#00A167",  Icon: CheckCircle2  },
  KYC_REJECTED:     { label: "Rejected",     bg: "#FDECEA", color: "#D92D20",  Icon: XCircle       },
  SUSPENDED:        { label: "Suspended",    bg: "#F5F5F5", color: "#888888",  Icon: AlertCircle   },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status as VerificationStatus];
  if (!cfg) return <span style={{ color: "var(--color-muted-foreground)" }}>{status}</span>;
  const { label, bg, color, Icon } = cfg;
  return (
    <span className={classes.statusPill} style={{ backgroundColor: bg, color }}>
      <Icon size={12} />
      {label}
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

const PAGE_SIZE = 25;

/* ── Table (server) ─────────────────────────────────────────────────────── */
async function SellersTable({ search, status, page }: { search: string; status: string; page: number }) {
  const where = {
    role: "SELLER" as const,
    ...(status ? { verificationStatus: status as VerificationStatus } : {}),
    ...(search
      ? {
          OR: [
            { email:  { contains: search, mode: "insensitive" as const } },
            { mobile: { contains: search } },
          ],
        }
      : {}),
  };

  const [sellers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
        verificationStatus: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function buildUrl(p: number) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (p > 1)  params.set("page", String(p));
    const str = params.toString();
    return `/admin/sellers${str ? `?${str}` : ""}`;
  }

  if (sellers.length === 0) {
    return (
      <div className={classes.tableCard}>
        <div className={classes.empty}>
          <Users size={32} style={{ opacity: 0.25 }} />
          <span>No sellers found{search || status ? " for the selected filters" : ""}.</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={classes.tableCard}>
        <table className={classes.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>KYC Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sellers.map(seller => (
              <tr key={seller.id}>
                <td>
                  <p className={classes.tdName}>{seller.fullName}</p>
                  <p className={classes.tdSub}>
                    Joined {new Date(seller.createdAt).toLocaleDateString("en-IN")}
                  </p>
                </td>
                <td>{seller.email}</td>
                <td>{seller.mobile}</td>
                <td><StatusPill status={seller.verificationStatus} /></td>
                <td>
                  <Link href={`/admin/sellers/${seller.id}`} className={classes.viewBtn}>
                    View
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
            Page {page} of {totalPages} · {total} total
          </span>
          <div className={s.paginationControls}>
            {page > 1 && (
              <Link href={buildUrl(page - 1)} className={s.pageBtn}>← Prev</Link>
            )}
            {page < totalPages && (
              <Link href={buildUrl(page + 1)} className={s.pageBtn}>Next →</Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default async function SellersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const { search = "", status = "", page: pageParam = "1" } = await searchParams;
  const page = Math.max(1, parseInt(pageParam, 10));

  return (
    <div className={classes.page}>
      <PageHeader backHref="/admin/dashboard" title="Sellers" />
      <Suspense fallback={null}>
        <SellersFilter />
      </Suspense>

      <Suspense
        fallback={
          <div className={classes.tableCard}>
            <table className={classes.table}>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Phone</th><th>KYC Status</th><th></th></tr>
              </thead>
              <tbody><SkeletonRows /></tbody>
            </table>
          </div>
        }
      >
        <SellersTable search={search} status={status} page={page} />
      </Suspense>
    </div>
  );
}
