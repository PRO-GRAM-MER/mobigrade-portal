import { prisma }         from "@/lib/prisma";
import { notFound }       from "next/navigation";
import Link               from "next/link";
import type { Metadata }  from "next";
import { ArrowRight, FileText, PenLine, Layers } from "lucide-react";
import { SLUG_TO_CATEGORY_TYPE, getCategoryConfig } from "@/lib/categories";
import s from "../../admin.module.css";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const config = getCategoryConfig(slug);
  return { title: `${config?.label ?? slug} — Seller Inventory` };
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  DRAFT:          { label: "Draft",          color: "neutral" },
  PENDING_REVIEW: { label: "Pending Review", color: "blue"    },
  APPROVED:       { label: "Approved",       color: "green"   },
  REJECTED:       { label: "Rejected",       color: "red"     },
  NEEDS_CHANGES:  { label: "Needs Changes",  color: "yellow"  },
};

const STATUS_TABS = [
  { value: "ALL",            label: "All"          },
  { value: "PENDING_REVIEW", label: "Pending"      },
  { value: "APPROVED",       label: "Approved"     },
  { value: "NEEDS_CHANGES",  label: "Changes Reqd" },
  { value: "REJECTED",       label: "Rejected"     },
  { value: "DRAFT",          label: "Draft"        },
];

const PAGE_SIZE = 30;

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export default async function SellerInventoryCategoryPage({
  params,
  searchParams,
}: {
  params:       Promise<{ slug: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { slug }     = await params;
  const sp           = await searchParams;
  const categoryType = SLUG_TO_CATEGORY_TYPE[slug];
  const config       = getCategoryConfig(slug);
  if (!categoryType || !config) notFound();

  const currentPage  = Math.max(1, parseInt(sp.page ?? "1", 10));
  const statusParam  = STATUS_TABS.find((t) => t.value === sp.status)?.value ?? "ALL";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { categoryType };
  if (statusParam !== "ALL") where.status = statusParam;

  const [drafts, total] = await Promise.all([
    prisma.catalogProductDraft.findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: where as any,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        sellerProfile: { include: { user: { select: { fullName: true } } } },
        batch:         { select: { filename: true } },
      },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.catalogProductDraft.count({ where: where as any }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function buildUrl(overrides: Record<string, string | undefined> = {}) {
    const vals: Record<string, string | undefined> = {
      status: statusParam !== "ALL" ? statusParam : undefined,
      page:   "1",
      ...overrides,
    };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(vals)) if (v) params.set(k, v);
    const str = params.toString();
    return `/admin/seller-inventory/${slug}${str ? `?${str}` : ""}`;
  }

  return (
    <div className={s.page}>

      {/* Header */}
      <div>
        <Link href="/admin/product-review" className={s.backLink}>
          ← Product Review
        </Link>
        <div className={s.topBar} style={{ marginTop: 6 }}>
          <div className={s.topBarLeft}>
            <h1 className={s.pageTitle}>{config.label} — Seller Submissions</h1>
            <p className={s.pageCount}>{total} submission{total !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      {/* Status tabs */}
      <div className={s.tabs}>
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={buildUrl({ status: tab.value === "ALL" ? undefined : tab.value })}
            className={`${s.tab} ${statusParam === tab.value ? s["tab--active"] : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Table */}
      {drafts.length === 0 ? (
        <div className={s.tableCard}>
          <div className={s.empty}>
            <Layers size={28} style={{ opacity: 0.3 }} />
            <span>No {config.label} submissions yet.</span>
          </div>
        </div>
      ) : (
        <>
          <div className={s.tableCard}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Seller</th>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((draft) => {
                  const sm = STATUS_META[draft.status] ?? STATUS_META.DRAFT;
                  return (
                    <tr key={draft.id}>
                      <td><p className={s.tdPrimary}>{draft.sellerProfile.user.fullName}</p></td>
                      <td>
                        <p className={s.tdPrimary}>{draft.partName ?? draft.brand}</p>
                        <p className={s.tdSub}>{draft.brand} · {draft.modelName}</p>
                      </td>
                      <td style={{ fontWeight: 600, color: "var(--color-accent)" }}>
                        ₹{Number(draft.price).toLocaleString("en-IN")}
                      </td>
                      <td style={{ color: "var(--color-muted-foreground)" }}>{draft.quantity}</td>
                      <td>
                        {draft.batch
                          ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: "var(--color-muted-foreground)" }}><FileText size={11} /> CSV</span>
                          : <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: "var(--color-muted-foreground)" }}><PenLine size={11} /> Manual</span>
                        }
                      </td>
                      <td>
                        <span className={`${s.badge} ${s[`badge--${sm.color}`]}`}>{sm.label}</span>
                      </td>
                      <td style={{ color: "var(--color-muted-foreground)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                        {fmtDate(draft.createdAt)}
                      </td>
                      <td>
                        <Link href={`/admin/product-review/${draft.id}`} className={s.actionBtn}>
                          {draft.status === "PENDING_REVIEW" ? "Review" : "View"} <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={s.pagination}>
              <span className={s.paginationInfo}>Page {currentPage} of {totalPages} · {total} total</span>
              <div className={s.paginationControls}>
                {currentPage > 1 && (
                  <Link href={buildUrl({ page: String(currentPage - 1) })} className={s.pageBtn}>← Prev</Link>
                )}
                {currentPage < totalPages && (
                  <Link href={buildUrl({ page: String(currentPage + 1) })} className={s.pageBtn}>Next →</Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
