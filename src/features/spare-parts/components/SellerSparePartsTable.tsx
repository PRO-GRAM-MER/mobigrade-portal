"use client"

import { useState } from "react"

type Part = {
  id: string
  name: string
  category: string
  qualityGrade: string
  status: string
  uploadType: string
  price: unknown
  discountedPrice: unknown
  quantity: number
  createdAt: Date
  models: { id: string; name: string; brand: { id: string; name: string } }[]
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  DRAFT:          { label: "Draft",          cls: "bg-muted text-muted-foreground border-border" },
  PENDING_REVIEW: { label: "Pending Review", cls: "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/25" },
  ACTIVE:         { label: "Active",         cls: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/25" },
  REJECTED:       { label: "Rejected",       cls: "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/25" },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.DRAFT
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function UploadBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border">
      {type === "CSV" ? "CSV" : "Manual"}
    </span>
  )
}

type Tab = "ALL" | "CSV" | "MANUAL"

export function SellerSparePartsTable({ parts }: { parts: Part[] }) {
  const [tab, setTab] = useState<Tab>("ALL")

  const csvCount    = parts.filter((p) => p.uploadType === "CSV").length
  const manualCount = parts.filter((p) => p.uploadType === "MANUAL").length

  const filtered = tab === "ALL" ? parts
    : tab === "CSV"    ? parts.filter((p) => p.uploadType === "CSV")
    : parts.filter((p) => p.uploadType === "MANUAL")

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "ALL",    label: "All",    count: parts.length },
    { key: "CSV",    label: "CSV Uploads", count: csvCount },
    { key: "MANUAL", label: "Manual", count: manualCount },
  ]

  if (parts.length === 0) {
    return (
      <div className="text-center py-16 space-y-2">
        <p className="text-[14px] font-medium text-foreground">No spare parts yet</p>
        <p className="text-[13px] text-muted-foreground">Create your first listing to get started.</p>
      </div>
    )
  }

  return (
    <>
      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-4 pt-4 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
              tab === t.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-[13px]">
          No {tab === "CSV" ? "CSV" : "manual"} uploads yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left font-medium text-muted-foreground py-3 px-4">Name</th>
                <th className="text-left font-medium text-muted-foreground py-3 px-4">Brand</th>
                <th className="text-left font-medium text-muted-foreground py-3 px-4">Models</th>
                <th className="text-left font-medium text-muted-foreground py-3 px-4">Price</th>
                <th className="text-left font-medium text-muted-foreground py-3 px-4">Qty</th>
                <th className="text-left font-medium text-muted-foreground py-3 px-4">Source</th>
                <th className="text-left font-medium text-muted-foreground py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((part) => {
                const brands = [...new Set(part.models.map((m) => m.brand.name))]
                return (
                  <tr key={part.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-foreground">{part.name}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {brands.length <= 2 ? brands.join(", ") : `${brands[0]} +${brands.length - 1}`}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {part.models.length === 0 ? "—"
                        : part.models.length === 1 ? part.models[0].name
                        : `${part.models[0].name} +${part.models.length - 1}`}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      ₹{Number(part.discountedPrice).toLocaleString("en-IN")}
                      {Number(part.price) !== Number(part.discountedPrice) && (
                        <span className="ml-1 line-through text-[11px] text-muted-foreground/50">
                          ₹{Number(part.price).toLocaleString("en-IN")}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">{part.quantity} pcs</td>
                    <td className="py-3.5 px-4"><UploadBadge type={part.uploadType} /></td>
                    <td className="py-3.5 px-4"><StatusBadge status={part.status} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
