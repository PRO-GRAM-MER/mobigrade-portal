import { prisma }        from "@/lib/prisma";
import { notFound }      from "next/navigation";
import Link              from "next/link";
import type { Metadata } from "next";
import { Globe, GlobeLock, ArrowRight, PackageSearch } from "lucide-react";
import { SLUG_TO_CATEGORY_TYPE, getCategoryConfig } from "@/lib/categories";
import s from "../../admin.module.css";
import PublishToggle from "./PublishToggle";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const config = getCategoryConfig(slug);
  return { title: `${config?.label ?? slug} — Website Inventory` };
}

const STATUS_TABS = [
  { value: "ALL",       label: "All"       },
  { value: "PUBLISHED", label: "Published" },
  { value: "DRAFT",     label: "Draft"     },
  { value: "ARCHIVED",  label: "Archived"  },
];

const PAGE_SIZE = 30;

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export default async function WebsiteInventoryCategoryPage({
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
  const where: any = {
    sellerProduct: { categoryType },
    ...(statusParam !== "ALL" ? { status: statusParam } : {}),
  };

  const [products, total, publishedCount] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.liveProduct as any).findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip:    (currentPage - 1) * PAGE_SIZE,
      take:    PAGE_SIZE,
      include: {
        sellerProduct: {
          select: {
            id: true, brand: true, modelName: true, partName: true,
            sellerPrice: true, quantity: true,
            sellerProfile: { include: { user: { select: { fullName: true } } } },
          },
        },
      },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.liveProduct as any).count({ where }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.liveProduct as any).count({ where: { sellerProduct: { categoryType }, status: "PUBLISHED" } }),
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
    return `/admin/website/${slug}${str ? `?${str}` : ""}`;
  }

  return (
    <div className={s.page}>

      {/* Header */}
      <div className={s.topBar}>
        <div className={s.topBarLeft}>
          <h1 className={s.pageTitle}>{config.label} — Website Inventory</h1>
          <p className={s.pageCount}>
            {total} listing{total !== 1 ? "s" : ""}
            {publishedCount > 0 && (
              <span style={{
                marginLeft: 8, padding: "2px 8px", borderRadius: 9999,
                background: "rgba(0,162,103,0.10)", color: "#007a50",
                fontSize: "0.72rem", fontWeight: 600,
              }}>
                {publishedCount} live
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
            <span>No {config.label} listings on the website yet.</span>
            <p style={{ fontSize: "0.8rem", color: "var(--color-muted-foreground)" }}>
              Enrich products in Our Inventory to publish them here.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className={s.tableCard}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Seller</th>
                  <th>Listing Price</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Published</th>
                  <th>Toggle</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {products.map((lp: any) => (
                  <tr key={lp.id}>
                    <td>
                      <p className={s.tdPrimary}>{lp.title}</p>
                      <p className={s.tdSub}>/{lp.slug}</p>
                    </td>
                    <td style={{ color: "var(--color-muted)" }}>
                      {lp.sellerProduct.sellerProfile.user.fullName}
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--color-accent)" }}>
                      ₹{Number(lp.listingPrice).toLocaleString("en-IN")}
                    </td>
                    <td style={{ color: "var(--color-muted-foreground)" }}>
                      {lp.sellerProduct.quantity}
                    </td>
                    <td>
                      {lp.status === "PUBLISHED" ? (
                        <span className={`${s.badge} ${s["badge--green"]}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Globe size={10} /> Published
                        </span>
                      ) : lp.status === "ARCHIVED" ? (
                        <span className={`${s.badge} ${s["badge--neutral"]}`}>Archived</span>
                      ) : (
                        <span className={`${s.badge} ${s["badge--yellow"]}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <GlobeLock size={10} /> Draft
                        </span>
                      )}
                    </td>
                    <td style={{ color: "var(--color-muted-foreground)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                      {lp.publishedAt ? fmtDate(lp.publishedAt) : "—"}
                    </td>
                    <td>
                      {lp.status !== "ARCHIVED" && (
                        <PublishToggle
                          liveProductId={lp.id}
                          currentStatus={lp.status}
                        />
                      )}
                    </td>
                    <td>
                      <Link href={`/admin/our-inventory/${slug}/${lp.sellerProduct.id}`} className={s.actionBtn}>
                        Edit <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
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
