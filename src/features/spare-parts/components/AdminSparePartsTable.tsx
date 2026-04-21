"use client"

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table"
import Link from "next/link"
import { ChevronRight, Package } from "lucide-react"

type SparePartRow = {
  id: string
  name: string
  price: unknown
  discountedPrice: unknown
  quantity: number
  status: string
  uploadType: string
  createdAt: Date
  seller: { id: string; firstName: string; lastName: string; email: string }
  models: { id: string; name: string; brand: { id: string; name: string } }[]
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; dot: string; cls: string }> = {
    DRAFT: { label: "Draft", dot: "bg-muted-foreground/50", cls: "bg-muted/60 text-muted-foreground border-border" },
    PENDING_REVIEW: { label: "Pending Review", dot: "bg-amber-500", cls: "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/25" },
    ACTIVE: { label: "Active", dot: "bg-emerald-500", cls: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/25" },
    REJECTED: { label: "Rejected", dot: "bg-red-500", cls: "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/25" },
  }
  const cfg = map[status] ?? map.DRAFT
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function UploadTypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border">
      {type === "CSV" ? "CSV Upload" : "Manual"}
    </span>
  )
}

const col = createColumnHelper<SparePartRow>()

const columns = [
  col.display({
    id: "part",
    header: "Spare Part",
    cell: ({ row }) => {
      const p = row.original
      return (
        <div>
          <p className="text-[13px] font-semibold text-foreground">{p.name}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {[...new Set(p.models.map((m) => m.brand.name))].slice(0, 2).join(", ")}
          </p>
        </div>
      )
    },
  }),
  col.display({
    id: "seller",
    header: "Seller",
    cell: ({ row }) => {
      const s = row.original.seller
      return (
        <div>
          <p className="text-[13px] text-foreground">{s.firstName} {s.lastName}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{s.email}</p>
        </div>
      )
    },
  }),
  col.display({
    id: "models",
    header: "Models",
    cell: ({ row }) => {
      const models = row.original.models
      if (models.length === 0) return <span className="text-muted-foreground/50 italic text-[12px]">—</span>
      const first = models[0].name
      const rest = models.length - 1
      return (
        <span className="text-[12px] text-muted-foreground">
          {first}{rest > 0 && <span className="ml-1 text-muted-foreground/60">+{rest} more</span>}
        </span>
      )
    },
  }),
  col.display({
    id: "pricing",
    header: "Price",
    cell: ({ row }) => {
      const p = row.original
      return (
        <div>
          <p className="text-[13px] font-medium text-foreground">
            ₹{Number(p.discountedPrice).toLocaleString("en-IN")}
          </p>
          {Number(p.price) !== Number(p.discountedPrice) && (
            <p className="text-[11px] text-muted-foreground/50 line-through mt-0.5">
              ₹{Number(p.price).toLocaleString("en-IN")}
            </p>
          )}
        </div>
      )
    },
  }),
  col.accessor("quantity", {
    header: "Qty",
    cell: (info) => (
      <span className="text-[13px] text-muted-foreground">{info.getValue()} pcs</span>
    ),
  }),
  col.display({
    id: "uploadType",
    header: "Upload Type",
    cell: ({ row }) => <UploadTypeBadge type={row.original.uploadType} />,
  }),
  col.display({
    id: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  }),
  col.display({
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Link
        href={`/admin/marketplace/sellers/spare-parts/${row.original.id}`}
        className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:text-primary/70 transition-colors"
      >
        View Details
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    ),
  }),
]

/* Mobile card */
function SparePartCard({ part }: { part: SparePartRow }) {
  return (
    <div className="group relative bg-card border border-border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-md hover:border-border/80">
      <div className={`h-0.5 w-full ${
        part.status === "ACTIVE" ? "bg-emerald-500"
        : part.status === "PENDING_REVIEW" ? "bg-amber-500"
        : part.status === "REJECTED" ? "bg-red-500"
        : "bg-border"
      }`} />
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-muted border border-border flex items-center justify-center flex-shrink-0">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-foreground leading-tight">{part.name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {[...new Set(part.models.map((m) => m.brand.name))].slice(0, 2).join(", ")}
              </p>
            </div>
          </div>
          <StatusBadge status={part.status} />
        </div>

        <div className="space-y-1.5">
          <p className="text-[12px] text-muted-foreground">
            <span className="font-medium text-foreground">{part.seller.firstName} {part.seller.lastName}</span>
            {" · "}{part.seller.email}
          </p>
          {part.models.length > 0 && (
            <p className="text-[12px] text-muted-foreground">
              {part.models.slice(0, 2).map(m => m.name).join(", ")}
              {part.models.length > 2 && ` +${part.models.length - 2} more`}
            </p>
          )}
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-semibold text-foreground">
              ₹{Number(part.discountedPrice).toLocaleString("en-IN")}
            </span>
            {Number(part.price) !== Number(part.discountedPrice) && (
              <span className="text-[11px] text-muted-foreground/50 line-through">
                ₹{Number(part.price).toLocaleString("en-IN")}
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">{part.quantity} pcs</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <UploadTypeBadge type={part.uploadType} />
          <Link
            href={`/admin/marketplace/sellers/spare-parts/${part.id}`}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:text-primary/70 transition-colors"
          >
            View Details
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export function AdminSparePartsTable({ parts }: { parts: SparePartRow[] }) {
  const table = useReactTable({
    data: parts,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (parts.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-[14px]">No spare parts submitted yet.</p>
      </div>
    )
  }

  return (
    <>
      {/* md+ table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map((header) => (
                  <th key={header.id} className="text-left font-medium text-muted-foreground py-3 px-4 whitespace-nowrap">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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

      {/* sm cards */}
      <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
        {parts.map((part) => (
          <SparePartCard key={part.id} part={part} />
        ))}
      </div>
    </>
  )
}
