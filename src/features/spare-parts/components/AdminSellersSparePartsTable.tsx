"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Search, ChevronRight, SlidersHorizontal, RotateCcw, Package } from "lucide-react"
import { FilterDropdown } from "./FilterDropdown"

type SellerRow = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  businessName: string | null
  verificationStatus: string
  totalParts: number
  pendingCount: number
  activeCount: number
  rejectedCount: number
  csvCount: number
  manualCount: number
  lastUploadAt: string | null
}

const UPLOAD_TYPE_OPTIONS = [
  { value: "CSV",    label: "CSV Upload" },
  { value: "MANUAL", label: "Manual" },
]

const STATUS_OPTIONS = [
  { value: "PENDING_REVIEW", label: "Pending Review", dot: "bg-amber-500" },
  { value: "ACTIVE",         label: "Active",         dot: "bg-emerald-500" },
  { value: "REJECTED",       label: "Rejected",       dot: "bg-red-500" },
  { value: "DRAFT",          label: "Draft",          dot: "bg-muted-foreground/40" },
]

const KYC_STYLES: Record<string, { label: string; cls: string }> = {
  APPROVED:     { label: "Approved",     cls: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/25" },
  UNDER_REVIEW: { label: "Under Review", cls: "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/25" },
  REJECTED:     { label: "Rejected",     cls: "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/25" },
  PENDING:      { label: "Pending",      cls: "bg-muted/60 text-muted-foreground border-border" },
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return "Today"
  if (d === 1) return "Yesterday"
  if (d < 30) return `${d}d ago`
  const m = Math.floor(d / 30)
  if (m < 12) return `${m}mo ago`
  return `${Math.floor(m / 12)}y ago`
}

interface Props {
  sellers: SellerRow[]
}

export function AdminSellersSparePartsTable({ sellers }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [filterUpload, setFilterUpload] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)

  const anyFilter = !!(search || filterUpload || filterStatus)

  function clearFilters() {
    setSearch("")
    setFilterUpload(null)
    setFilterStatus(null)
  }

  const filtered = useMemo(() => {
    let r = sellers
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(
        (s) =>
          s.email.toLowerCase().includes(q) ||
          (s.phone ?? "").includes(q) ||
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
          (s.businessName ?? "").toLowerCase().includes(q)
      )
    }
    if (filterUpload === "CSV")    r = r.filter((s) => s.csvCount > 0)
    if (filterUpload === "MANUAL") r = r.filter((s) => s.manualCount > 0)
    if (filterStatus === "PENDING_REVIEW") r = r.filter((s) => s.pendingCount > 0)
    if (filterStatus === "ACTIVE")         r = r.filter((s) => s.activeCount > 0)
    if (filterStatus === "REJECTED")       r = r.filter((s) => s.rejectedCount > 0)
    if (filterStatus === "DRAFT")          r = r.filter((s) => s.totalParts - s.pendingCount - s.activeCount - s.rejectedCount > 0)
    return r
  }, [sellers, search, filterUpload, filterStatus])

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-wrap">
        <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-[320px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by email or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-[13px] bg-muted/50 border border-border rounded-lg
              placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring
              focus:bg-background transition-colors"
          />
        </div>

        <FilterDropdown
          label="Source"
          options={UPLOAD_TYPE_OPTIONS}
          value={filterUpload}
          onChange={setFilterUpload}
        />

        <FilterDropdown
          label="Part Status"
          options={STATUS_OPTIONS}
          value={filterStatus}
          onChange={setFilterStatus}
        />

        {anyFilter && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 h-8 px-3 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
          >
            <RotateCcw className="h-3 w-3" />
            Clear
          </button>
        )}

        <span className="ml-auto text-[12px] text-muted-foreground">
          {filtered.length} of {sellers.length} sellers
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Package className="h-10 w-10 opacity-20" />
          <p className="text-[13px]">{anyFilter ? "No sellers match the filters." : "No sellers found."}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Seller</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Contact</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">KYC</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Parts</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Source</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Last Upload</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => {
                const kyc = KYC_STYLES[s.verificationStatus] ?? KYC_STYLES.PENDING
                return (
                  <tr
                    key={s.id}
                    onClick={() => router.push(`/admin/marketplace/sellers/spare-parts/${s.id}`)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-foreground">{s.firstName} {s.lastName}</p>
                      {s.businessName && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{s.businessName}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-foreground">{s.email}</p>
                      {s.phone && <p className="text-[11px] text-muted-foreground mt-0.5">{s.phone}</p>}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${kyc.cls}`}>
                        {kyc.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-foreground font-medium">{s.totalParts} total</span>
                        {s.pendingCount > 0 && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 font-medium">
                            {s.pendingCount} pending
                          </span>
                        )}
                        {s.activeCount > 0 && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-medium">
                            {s.activeCount} active
                          </span>
                        )}
                        {s.rejectedCount > 0 && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 font-medium">
                            {s.rejectedCount} rejected
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        {s.csvCount > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                            {s.csvCount} CSV
                          </span>
                        )}
                        {s.manualCount > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border">
                            {s.manualCount} Manual
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[12px] text-muted-foreground">
                      {s.lastUploadAt ? timeAgo(s.lastUploadAt) : "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground group-hover:text-primary transition-colors">
                        View
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
