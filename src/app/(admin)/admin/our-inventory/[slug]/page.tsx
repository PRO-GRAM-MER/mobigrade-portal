import { prisma }        from "@/lib/prisma";
import { notFound }      from "next/navigation";
import Link              from "next/link";
import type { Metadata } from "next";
import { ArrowRight, PackageSearch, Rocket } from "lucide-react";
import { SLUG_TO_CATEGORY_TYPE, getCategoryConfig } from "@/lib/categories";
import s from "../../admin.module.css";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const config = getCategoryConfig(slug);
  return { title: `${config?.label ?? slug} — Our Inventory` };
}

const SP_STATUS_META: Record<string, { label: string; color: string }> = {
  ACTIVE:       { label: "Active",       color: "blue"    },
  ENRICHING:    { label: "Enriching",    color: "yellow"  },
  LIVE:         { label: "Live",         color: "green"   },
  PAUSED:       { label: "Paused",       color: "neutral" },
  DISCONTINUED: { label: "Discontinued", color: "red"     },
};

const STATUS_TABS = [
  { value: "ALL",          label: "All"          },
  { value: "ACTIVE",       label: "Needs Enrich" },
  { value: "ENRICHING",    label: "Enriching"    },
  { value: "LIVE",         label: "Live"         },
  { value: "PAUSED",       label: "Paused"       },
];

const PAGE_SIZE = 30;

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export default async function OurInventoryCategoryPage({
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

  const currentPage = Math.max(1, parseInt(sp.page ?? "1", 10));
  const statusParam = STATUS_TABS.find((t) => t.value === sp.status)?.value ?? "ALL";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { categoryType };
  if (statusParam !== "ALL") where.status = statusParam;

  const [products, total, needsEnrichCount] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.sellerProduct as any).findMany({
      where,
      orderBy: { approvedAt: "desc" },
      skip:    (currentPage - 1) * PAGE_SIZE,
      take:    PAGE_SIZE,
      include: {
        sellerProfile: { include: { user: { select: { fullName: true } } } },
        liveProduct:   { select: { id: true, status: true, listingPrice: true, slug: true } },
      },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.sellerProduct as any).count({ where }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.sellerProduct as any).count({ where: { categoryType, status: "ACTIVE" } }),
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
    return `/admin/our-inventory/${slug}${str ? `?${str}` : ""}`;
  }

  return (
    <div className={s.page}>

      {/* Header */}
      <div className={s.topBar}>
        <div className={s.topBarLeft}>
          <h1 className={s.pageTitle}>{config.label} — Our Inventory</h1>
          <p className={s.pageCount}>
            {total} product{total !== 1 ? "s" : ""}
            {needsEnrichCount > 0 && (
              <span style={{
                marginLeft: 8, padding: "2px 8px", borderRadius: 9999,
                background: "rgba(47,53,103,0.10)", color: "var(--color-primary)",
                fontSize: "0.72rem", fontWeight: 600,
              }}>
                {needsEnrichCount} need enrichment
              </span>
            )}
          </p>
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
      {products.length === 0 ? (
        <div className={s.tableCard}>
          <div className={s.empty}>
            <PackageSearch size={28} style={{ opacity: 0.3 }} />
            <span>No {config.label} products in inventory yet.</span>
            <p style={{ fontSize: "0.8rem", color: "var(--color-muted-foreground)" }}>
              Products appear here when drafts are approved in Product Review.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className={s.tableCard}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Seller</th>
                  {config.slug === "spare-parts" && <th>Condition</th>}
                  <th>Seller Price</th>
                  <th>Listing Price</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Approved</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {products.map((sp: any) => {
                  const sm = SP_STATUS_META[sp.status] ?? SP_STATUS_META.ACTIVE;
                  return (
                    <tr key={sp.id}>
                      <td>
                        <p className={s.tdPrimary}>{sp.partName ?? sp.brand}</p>
                        <p className={s.tdSub}>{sp.brand} · {sp.modelName}</p>
                      </td>
                      <td style={{ color: "var(--color-muted)" }}>{sp.sellerProfile.user.fullName}</td>
                      {config.slug === "spare-parts" && (
                        <td style={{ color: "var(--color-muted-foreground)", fontSize: "0.8rem" }}>{sp.condition ?? "—"}</td>
                      )}
                      <td style={{ color: "var(--color-muted-foreground)" }}>
                        ₹{Number(sp.sellerPrice).toLocaleString("en-IN")}
                      </td>
                      <td style={{ fontWeight: sp.liveProduct ? 600 : 400, color: sp.liveProduct ? "var(--color-accent)" : "var(--color-muted-foreground)" }}>
                        {sp.liveProduct
                          ? `₹${Number(sp.liveProduct.listingPrice).toLocaleString("en-IN")}`
                          : <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--color-accent)", fontSize: "0.78rem", fontWeight: 600 }}>
                              <Rocket size={11} /> Set price
                            </span>
                        }
                      </td>
                      <td style={{ color: "var(--color-muted-foreground)" }}>{sp.quantity}</td>
                      <td>
                        <span className={`${s.badge} ${s[`badge--${sm.color}`]}`}>{sm.label}</span>
                      </td>
                      <td style={{ color: "var(--color-muted-foreground)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                        {fmtDate(sp.approvedAt)}
                      </td>
                      <td>
                        <Link href={`/admin/our-inventory/${slug}/${sp.id}`} className={s.actionBtn}>
                          {sp.liveProduct ? "View" : "Enrich"} <ArrowRight size={12} />
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
