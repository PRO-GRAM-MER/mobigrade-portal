"use client"

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table"
import Link from "next/link"
import { ChevronRight, Building2, Mail, Phone, User } from "lucide-react"
import type { OnboardingSellerRow } from "../queries"

// ── Status helpers ──────────────────────────────────────────────────────────

function getStatusConfig(row: OnboardingSellerRow) {
  const status = row.sellerProfile?.verificationStatus
  if (!status || status === "PENDING") {
    return {
      label: "Incomplete",
      dot: "bg-muted-foreground/40",
      badge:
        "bg-muted/60 text-muted-foreground border border-border",
    }
  }
  if (status === "UNDER_REVIEW") {
    return {
      label: "Under Review",
      dot: "bg-amber-500",
      badge:
        "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/25",
    }
  }
  if (status === "APPROVED") {
    return {
      label: "Approved",
      dot: "bg-emerald-500",
      badge:
        "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/25",
    }
  }
  if (status === "REJECTED") {
    return {
      label: "Rejected",
      dot: "bg-red-500",
      badge:
        "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/25",
    }
  }
  return { label: status, dot: "bg-muted-foreground", badge: "bg-muted text-muted-foreground border border-border" }
}

function StatusBadge({ row }: { row: OnboardingSellerRow }) {
  const { label, dot, badge } = getStatusConfig(row)
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${dot}`} />
      {label}
    </span>
  )
}

function Avatar({ seller }: { seller: OnboardingSellerRow }) {
  const initials = `${seller.firstName[0]}${seller.lastName[0]}`.toUpperCase()
  if (seller.sellerProfile?.businessName) {
    return (
      <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
        <span className="text-[11px] font-bold text-primary">{initials}</span>
      </div>
    )
  }
  return (
    <div className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0">
      <span className="text-[11px] font-semibold text-muted-foreground">{initials}</span>
    </div>
  )
}

// ── TanStack column def ─────────────────────────────────────────────────────

const col = createColumnHelper<OnboardingSellerRow>()

const columns = [
  col.display({
    id: "seller",
    header: "Seller",
    cell: ({ row }) => {
      const s = row.original
      return (
        <div className="flex items-center gap-3">
          <Avatar seller={s} />
          <div>
            <p className="text-[13px] font-semibold text-foreground leading-tight">
              {s.firstName} {s.lastName}
            </p>
            {s.sellerProfile?.businessName && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {s.sellerProfile.businessName}
              </p>
            )}
          </div>
        </div>
      )
    },
  }),
  col.accessor("email", {
    header: "Email",
    cell: (info) => (
      <span className="text-[13px] text-muted-foreground">{info.getValue()}</span>
    ),
  }),
  col.accessor("phone", {
    header: "Phone",
    cell: (info) =>
      info.getValue() ? (
        <span className="text-[13px] text-muted-foreground">{info.getValue()}</span>
      ) : (
        <span className="text-[12px] text-muted-foreground/40 italic">—</span>
      ),
  }),
  col.display({
    id: "status",
    header: "Profile Status",
    cell: ({ row }) => <StatusBadge row={row.original} />,
  }),
  col.display({
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Link
        href={`/admin/onboarding/sellers/${row.original.id}`}
        className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:text-primary/70 transition-colors"
      >
        View Details
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    ),
  }),
]

// ── Premium mobile seller card ──────────────────────────────────────────────

function SellerCard({ seller }: { seller: OnboardingSellerRow }) {
  const { label, dot, badge } = getStatusConfig(seller)
  const initials = `${seller.firstName[0]}${seller.lastName[0]}`.toUpperCase()
  const joinedDate = new Date(seller.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

  return (
    <div className="group relative bg-card border border-border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md hover:border-border/80">
      {/* Top accent strip based on status */}
      <div
        className={`h-0.5 w-full ${
          seller.sellerProfile?.verificationStatus === "APPROVED"
            ? "bg-emerald-500"
            : seller.sellerProfile?.verificationStatus === "UNDER_REVIEW"
              ? "bg-amber-500"
              : seller.sellerProfile?.verificationStatus === "REJECTED"
                ? "bg-red-500"
                : "bg-border"
        }`}
      />

      <div className="p-5">
        {/* Header row: avatar + name + status */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 flex items-center justify-center flex-shrink-0">
                <span className="text-[13px] font-bold text-primary">{initials}</span>
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${dot}`} />
            </div>
            <div>
              <p className="text-[14px] font-bold text-foreground leading-tight">
                {seller.firstName} {seller.lastName}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Joined {joinedDate}
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide flex-shrink-0 ${badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${dot}`} />
            {label}
          </span>
        </div>

        {/* Info rows */}
        <div className="space-y-2.5 mb-4">
          {seller.sellerProfile?.businessName && (
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span className="text-[12px] text-foreground font-medium truncate">
                {seller.sellerProfile.businessName}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="text-[12px] text-muted-foreground truncate">{seller.email}</span>
          </div>
          {seller.phone && (
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span className="text-[12px] text-muted-foreground">{seller.phone}</span>
            </div>
          )}
          {!seller.sellerProfile?.businessName && (
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span className="text-[12px] text-muted-foreground/60 italic">No KYC submitted</span>
            </div>
          )}
        </div>

        {/* CTA */}
        <Link
          href={`/admin/onboarding/sellers/${seller.id}`}
          className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/10 hover:border-primary/20 transition-all duration-150 group/btn"
        >
          <span className="text-[12px] font-semibold text-primary">View Details</span>
          <ChevronRight className="h-4 w-4 text-primary transition-transform duration-150 group-hover/btn:translate-x-0.5" />
        </Link>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export function SellersTable({ sellers }: { sellers: OnboardingSellerRow[] }) {
  const table = useReactTable({
    data: sellers,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (sellers.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-[14px]">No sellers found.</p>
      </div>
    )
  }

  return (
    <>
      {/* ── md+ TanStack table ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-left font-medium text-muted-foreground py-3 px-4 whitespace-nowrap"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="py-3.5 px-4">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── sm premium card grid ── */}
      <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
        {sellers.map((seller) => (
          <SellerCard key={seller.id} seller={seller} />
        ))}
      </div>
    </>
  )
}
