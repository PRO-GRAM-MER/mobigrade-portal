import { prisma }     from "@/lib/prisma";
import Link            from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight, FileText, PenLine,
  ClipboardCheck, Clock, CheckCircle2, XCircle, AlertCircle, Layers,
} from "lucide-react";
import s from "../admin.module.css";
import r from "./review.module.css";
import ReviewFilterBar from "./ReviewFilterBar";

export const metadata: Metadata = { title: "Submissions — MobiGrade Portal" };

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  SPARE_PARTS: "Spare Parts",
  VRP:         "VRP",
  NEW_PHONES:  "New Phones",
  PREXO:       "PREXO",
  OPEN_BOX:    "Open Box",
};

const CATEGORY_COLORS: Record<string, string> = {
  SPARE_PARTS: "neutral",
  VRP:         "blue",
  NEW_PHONES:  "green",
  PREXO:       "orange",
  OPEN_BOX:    "yellow",
};

const STATUS_META: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  DRAFT:          { label: "Draft",          color: "neutral", Icon: Clock        },
  PENDING_REVIEW: { label: "Pending Review", color: "blue",    Icon: ClipboardCheck },
  APPROVED:       { label: "Approved",       color: "green",   Icon: CheckCircle2 },
  REJECTED:       { label: "Rejected",       color: "red",     Icon: XCircle      },
  NEEDS_CHANGES:  { label: "Needs Changes",  color: "yellow",  Icon: AlertCircle  },
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

function buildSpecSummary(draft: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  categoryType: any; partName: string | null; condition: string | null; specs: any
}): string {
  const cat = String(draft.categoryType);
  if (cat === "SPARE_PARTS") {
    return [draft.partName, draft.condition].filter(Boolean).join(" · ");
  }
  const sp = draft.specs as Record<string, unknown> | null;
  if (!sp) return "—";
  const parts: string[] = [];
  if (sp.storage)  parts.push(String(sp.storage));
  if (sp.ram)      parts.push(`${sp.ram} RAM`);
  if (sp.grade)    parts.push(String(sp.grade));
  if (sp.color)    parts.push(String(sp.color));
  return parts.join(" · ") || "—";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?:       string;
    status?:  string;
    cat?:     string;
    source?:  string;
    from?:    string;
    to?:      string;
    page?:    string;
  }>;
}) {
  const sp          = await searchParams;
  const currentPage = Math.max(1, parseInt(sp.page ?? "1", 10));
  const q           = sp.q?.trim() ?? "";
  const statusParam = STATUS_TABS.find((t) => t.value === sp.status)?.value ?? "ALL";
  const catParam    = sp.cat ?? "";
  const sourceParam = sp.source ?? "";

  // ── Build Prisma where ─────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (statusParam !== "ALL") where.status = statusParam;
  if (catParam)              where.categoryType = catParam;
  if (sourceParam === "csv")    where.batchId = { not: null };
  if (sourceParam === "manual") where.batchId = null;
  if (sp.from || sp.to) {
    where.createdAt = {
      ...(sp.from ? { gte: new Date(sp.from) } : {}),
      ...(sp.to   ? { lte: new Date(sp.to + "T23:59:59") } : {}),
    };
  }
  if (q) {
    where.OR = [
      { brand:     { contains: q, mode: "insensitive" } },
      { modelName: { contains: q, mode: "insensitive" } },
      { partName:  { contains: q, mode: "insensitive" } },
      { sellerProfile: { user: { fullName: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const [drafts, total, pendingCount] = await Promise.all([
    prisma.catalogProductDraft.findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: where as any,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        status: true,
        brand: true,
        modelName: true,
        partName: true,
        condition: true,
        price: true,
        quantity: true,
        createdAt: true,
        specs: true,
        categoryType: true,
        sellerProfile: { select: { user: { select: { fullName: true } } } },
        batch: { select: { filename: true } },
      },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.catalogProductDraft.count({ where: where as any }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.catalogProductDraft.count({ where: { status: "PENDING_REVIEW" as any } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Build URL helper for filter/pagination links
  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const vals: Record<string, string | undefined> = {
      q:      q      || undefined,
      status: statusParam !== "ALL" ? statusParam : undefined,
      cat:    catParam   || undefined,
      source: sourceParam || undefined,
      from:   sp.from    || undefined,
      to:     sp.to      || undefined,
      page:   "1",
      ...overrides,
    };
    for (const [k, v] of Object.entries(vals)) {
      if (v) params.set(k, v);
    }
    const str = params.toString();
    return `/admin/product-review${str ? `?${str}` : ""}`;
  }

  return (
    <div className={s.page}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={s.topBar}>
        <div className={s.topBarLeft}>
          <h1 className={s.pageTitle}>Submissions</h1>
          <p className={s.pageCount}>
            {total} submission{total !== 1 ? "s" : ""}
            {pendingCount > 0 && (
              <span className={r.pendingBadge}>{pendingCount} pending</span>
            )}
          </p>
        </div>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <ReviewFilterBar
        initialQ={q}
        initialCat={catParam}
        initialSource={sourceParam}
        initialFrom={sp.from ?? ""}
        initialTo={sp.to ?? ""}
        currentStatus={statusParam}
      />

      {/* ── Status tabs ─────────────────────────────────────────────────── */}
      <div className={s.tabs}>
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={buildUrl({ status: tab.value === "ALL" ? undefined : tab.value, page: "1" })}
            className={`${s.tab} ${statusParam === tab.value ? s["tab--active"] : ""}`}
          >
            {tab.label}
            {tab.value === "PENDING_REVIEW" && pendingCount > 0 && (
              <span className={r.tabCount}>{pendingCount}</span>
            )}
          </Link>
        ))}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      {drafts.length === 0 ? (
        <div className={s.tableCard}>
          <div className={s.empty}>
            <Layers size={28} style={{ opacity: 0.3 }} />
            <span>No submissions match the current filters.</span>
          </div>
        </div>
      ) : (
        <>
          <div className={s.tableCard}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Seller</th>
                  <th>Category</th>
                  <th>Product</th>
                  <th>Specs</th>
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
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const cat    = String((draft as any).categoryType);
                  const sm     = STATUS_META[draft.status] ?? STATUS_META.DRAFT;
                  const specSummary = buildSpecSummary(draft as Parameters<typeof buildSpecSummary>[0]);

                  return (
                    <tr key={draft.id}>
                      {/* Seller */}
                      <td>
                        <p className={s.tdPrimary}>{draft.sellerProfile.user.fullName}</p>
                      </td>

                      {/* Category */}
                      <td>
                        <span className={`${s.badge} ${s[`badge--${CATEGORY_COLORS[cat] ?? "neutral"}`]}`}>
                          {CATEGORY_LABELS[cat] ?? cat}
                        </span>
                      </td>

                      {/* Product */}
                      <td>
                        <p className={s.tdPrimary}>{draft.brand}</p>
                        <p className={s.tdSub}>{draft.modelName}</p>
                      </td>

                      {/* Specs summary */}
                      <td className={r.specsCell}>{specSummary}</td>

                      {/* Price */}
                      <td style={{ fontWeight: 600, color: "var(--color-primary)" }}>
                        ₹{Number(draft.price).toLocaleString("en-IN")}
                      </td>

                      {/* Qty */}
                      <td style={{ color: "var(--color-muted-foreground)" }}>{draft.quantity}</td>

                      {/* Source */}
                      <td>
                        {draft.batch ? (
                          <span className={r.sourceChip} title={draft.batch.filename}>
                            <FileText size={11} /> CSV
                          </span>
                        ) : (
                          <span className={`${r.sourceChip} ${r["sourceChip--manual"]}`}>
                            <PenLine size={11} /> Manual
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`${s.badge} ${s[`badge--${sm.color}`]}`}>
                          {sm.label}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ color: "var(--color-muted-foreground)", whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                        {fmtDate(draft.createdAt)}
                      </td>

                      {/* Action */}
                      <td>
                        <Link href={`/admin/product-review/${draft.id}`} className={s.actionBtn}>
                          {draft.status === "PENDING_REVIEW" ? "Review" : "View"}
                          <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={s.pagination}>
              <span className={s.paginationInfo}>
                Page {currentPage} of {totalPages} · {total} total
              </span>
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
