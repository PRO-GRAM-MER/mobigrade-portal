import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { DraftStatus } from "@prisma/client";
import PageHeader from "@/components/shared/PageHeader";

export const metadata = { title: "My Products — MobiGrade Portal" };

const STATUS_TABS: { value: DraftStatus | "ALL"; label: string }[] = [
  { value: "ALL",            label: "All" },
  { value: "PENDING_REVIEW", label: "Pending Review" },
  { value: "APPROVED",       label: "Approved" },
  { value: "DRAFT",          label: "Drafts" },
  { value: "REJECTED",       label: "Rejected" },
  { value: "NEEDS_CHANGES",  label: "Needs Changes" },
];

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await auth();
  const { status, page } = await searchParams;

  const PAGE_SIZE = 20;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const statusFilter = STATUS_TABS.find((t) => t.value === status)?.value ?? "ALL";

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: session!.user.id as string },
    select: { id: true },
  });

  const where = {
    sellerProfileId: sellerProfile?.id ?? "",
    ...(statusFilter !== "ALL" ? { status: statusFilter as DraftStatus } : {}),
  };

  const [drafts, total] = await Promise.all([
    prisma.catalogProductDraft.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        category: { select: { name: true } },
      },
    }),
    prisma.catalogProductDraft.count({ where }),
  ]);

  return (
    <div className="page">
      <PageHeader
        backHref="/dashboard"
        title="My Products"
        right={<Link href="/upload" className="btn btn--primary">+ Bulk Upload</Link>}
      />

      {/* Status tabs */}
      <div className="tabs">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/products${tab.value !== "ALL" ? `?status=${tab.value}` : ""}`}
            className={`tab ${statusFilter === tab.value ? "tab--active" : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {drafts.length === 0 ? (
        <div className="empty-state">
          <p>No products found.</p>
          <Link href="/upload" className="btn btn--primary">Upload CSV</Link>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  {["Product", "Category", "Condition", "Price", "Qty", "Status"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drafts.map((draft) => (
                  <tr key={draft.id}>
                    <td className="td--name">
                      {draft.partName}
                      <span className="td--sub">{draft.brand} · {draft.modelName}</span>
                    </td>
                    <td>
                      <span className="badge badge--neutral">
                        {draft.category?.name ?? "—"}
                      </span>
                    </td>
                    <td className="td--muted">{draft.condition}</td>
                    <td>₹{Number(draft.price).toLocaleString("en-IN")}</td>
                    <td className="td--muted">{draft.quantity}</td>
                    <td>
                      <StatusBadge status={draft.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <span className="pagination-info">
              {total} product{total !== 1 ? "s" : ""}
            </span>
            <div className="pagination-controls">
              {currentPage > 1 && (
                <Link href={`/products?${statusFilter !== "ALL" ? `status=${statusFilter}&` : ""}page=${currentPage - 1}`} className="btn btn--ghost">
                  ← Prev
                </Link>
              )}
              {currentPage * PAGE_SIZE < total && (
                <Link href={`/products?${statusFilter !== "ALL" ? `status=${statusFilter}&` : ""}page=${currentPage + 1}`} className="btn btn--ghost">
                  Next →
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: DraftStatus }) {
  const map: Record<DraftStatus, string> = {
    DRAFT:          "badge badge--neutral",
    PENDING_REVIEW: "badge badge--blue",
    APPROVED:       "badge badge--green",
    REJECTED:       "badge badge--red",
    NEEDS_CHANGES:  "badge badge--yellow",
  };
  return (
    <span className={map[status] ?? "badge badge--neutral"}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
