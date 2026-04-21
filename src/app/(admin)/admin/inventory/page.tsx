import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";
import type { SellerProductStatus } from "@prisma/client";
import { ArrowRight, PackageSearch } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import s from "../admin.module.css";

export const metadata: Metadata = { title: "Inventory — MobiGrade Portal" };

const STATUS_TABS: { value: SellerProductStatus | "ALL"; label: string }[] = [
  { value: "ALL",          label: "All" },
  { value: "ACTIVE",       label: "Active" },
  { value: "ENRICHING",    label: "Enriching" },
  { value: "LIVE",         label: "Live" },
  { value: "PAUSED",       label: "Paused" },
  { value: "DISCONTINUED", label: "Discontinued" },
];

const SP_STATUS_COLOR: Record<SellerProductStatus, string> = {
  ACTIVE:       "blue",
  ENRICHING:    "yellow",
  LIVE:         "green",
  PAUSED:       "neutral",
  DISCONTINUED: "red",
};

const PAGE_SIZE = 25;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status, page } = await searchParams;
  const currentPage  = Math.max(1, parseInt(page ?? "1", 10));
  const statusFilter = STATUS_TABS.find((t) => t.value === status)?.value ?? "ALL";
  const where        = statusFilter !== "ALL" ? { status: statusFilter as SellerProductStatus } : {};

  const [products, total] = await Promise.all([
    prisma.sellerProduct.findMany({
      where,
      orderBy: { approvedAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        brand: true,
        modelName: true,
        partName: true,
        condition: true,
        sellerPrice: true,
        quantity: true,
        status: true,
        sellerProfile: { select: { user: { select: { fullName: true } } } },
        category: { select: { name: true } },
        liveProduct: { select: { id: true, status: true, listingPrice: true } },
      },
    }),
    prisma.sellerProduct.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const baseQuery  = statusFilter !== "ALL" ? `status=${statusFilter}&` : "";

  return (
    <div className={s.page}>
      <PageHeader
        backHref="/admin/dashboard"
        title="Inventory"
        subtitle={`${total} product${total !== 1 ? "s" : ""}`}
      />

      <div className={s.tabs}>
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/inventory${tab.value !== "ALL" ? `?status=${tab.value}` : ""}`}
            className={`${s.tab} ${statusFilter === tab.value ? s["tab--active"] : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <div className={s.tableCard}>
          <div className={s.empty}>
            <PackageSearch size={28} style={{ opacity: 0.3 }} />
            <span>No products in this status.</span>
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
                  <th>Category</th>
                  <th>Condition</th>
                  <th>Seller Price</th>
                  <th>Live Price</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((sp) => (
                  <tr key={sp.id}>
                    <td>
                      <p className={s.tdPrimary}>{sp.partName}</p>
                      <p className={s.tdSub}>{sp.brand} · {sp.modelName}</p>
                    </td>
                    <td style={{ color: "var(--color-muted)" }}>{sp.sellerProfile.user.fullName}</td>
                    <td style={{ color: "var(--color-muted-foreground)", fontSize: "0.8rem" }}>{sp.category?.name ?? "—"}</td>
                    <td style={{ color: "var(--color-muted-foreground)", fontSize: "0.8rem" }}>{sp.condition}</td>
                    <td style={{ fontWeight: 500, color: "var(--color-primary)" }}>
                      ₹{Number(sp.sellerPrice).toLocaleString("en-IN")}
                    </td>
                    <td style={{ color: sp.liveProduct ? "var(--color-primary)" : "var(--color-muted-foreground)", fontWeight: sp.liveProduct ? 500 : 400 }}>
                      {sp.liveProduct
                        ? `₹${Number(sp.liveProduct.listingPrice).toLocaleString("en-IN")}`
                        : "—"}
                    </td>
                    <td style={{ color: "var(--color-muted-foreground)" }}>{sp.quantity}</td>
                    <td>
                      <span className={`${s.badge} ${s[`badge--${SP_STATUS_COLOR[sp.status]}`]}`}>
                        {sp.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>
                      <Link href={`/admin/inventory/${sp.id}`} className={s.actionBtn}>
                        {sp.status === "ACTIVE" ? "Enrich" : "View"} <ArrowRight size={13} />
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
                  <Link href={`/admin/inventory?${baseQuery}page=${currentPage - 1}`} className={s.pageBtn}>
                    ← Prev
                  </Link>
                )}
                {currentPage < totalPages && (
                  <Link href={`/admin/inventory?${baseQuery}page=${currentPage + 1}`} className={s.pageBtn}>
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
