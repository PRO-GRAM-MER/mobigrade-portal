"use client"

import { useState, useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import { SlidersHorizontal, Package, RotateCcw, ChevronRight, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FilterDropdown } from "@/features/spare-parts/components/FilterDropdown"
import { updateListingStatusAction } from "../admin-actions"

type Listing = {
  id: string
  price: number
  stock: number
  sku: string | null
  condition: string
  warrantyMonths: number | null
  status: string
  uploadType: string
  deployedAt: string | null
  createdAt: string
  variant: {
    id: string; ram: number; storage: number; color: string; colorHex: string | null
    phone: { id: string; name: string; brand: { id: string; name: string }; images: { url: string }[] }
  }
}

const STATUS_OPTIONS = [
  { value: "PENDING_REVIEW", label: "Pending Review" },
  { value: "ACTIVE",         label: "Active"         },
  { value: "REJECTED",       label: "Rejected"       },
  { value: "DRAFT",          label: "Draft"          },
]

const STATUS_STYLES: Record<string, { dot: string; trigger: string }> = {
  PENDING_REVIEW: { dot: "bg-amber-500",          trigger: "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-100" },
  ACTIVE:         { dot: "bg-emerald-500",         trigger: "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100" },
  REJECTED:       { dot: "bg-red-500",             trigger: "border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-100" },
  DRAFT:          { dot: "bg-muted-foreground/40", trigger: "border-border bg-muted/40 text-muted-foreground hover:bg-muted/60" },
}

const CONDITION_OPTIONS = [{ value: "SEALED", label: "Sealed" }, { value: "OPEN_BOX", label: "Open Box" }]
const UPLOAD_OPTIONS    = [{ value: "CSV", label: "CSV" }, { value: "MANUAL", label: "Manual" }]

function StatusSelect({ listingId, sellerId, current }: { listingId: string; sellerId: string; current: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const s = STATUS_STYLES[current] ?? STATUS_STYLES.DRAFT
  return (
    <Select value={current} onValueChange={v => startTransition(async () => {
      const res = await updateListingStatusAction(listingId, v as "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "REJECTED", sellerId)
      if (res.success) { toast.success(res.message); router.refresh() }
      else toast.error(res.error ?? "Failed")
    })}>
      <SelectTrigger onClick={e => e.stopPropagation()} disabled={isPending}
        className={`h-7 w-[148px] text-[12px] font-semibold border rounded-full px-3 gap-2 focus:ring-0 focus:ring-offset-0 shadow-none disabled:opacity-60 transition-colors ${s.trigger}`}>
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${s.dot}`} />}
        <SelectValue>{STATUS_OPTIONS.find(o => o.value === current)?.label}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start" className="min-w-[160px]">
        {STATUS_OPTIONS.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${(STATUS_STYLES[opt.value] ?? STATUS_STYLES.DRAFT).dot}`} />
              {opt.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function BulkBar({ selectedIds, listings, sellerId, onDone }: { selectedIds: Set<string>; listings: Listing[]; sellerId: string; onDone: () => void }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  function applyStatus(status: "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "REJECTED") {
    const targets = listings.filter(l => selectedIds.has(l.id))
    startTransition(async () => {
      let ok = 0
      for (const l of targets) {
        const res = await updateListingStatusAction(l.id, status, sellerId)
        if (res.success) ok++
      }
      toast.success(`${ok} listing${ok !== 1 ? "s" : ""} updated`)
      router.refresh(); onDone()
    })
  }
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border-b border-primary/15 flex-wrap">
      <span className="text-[13px] font-semibold text-foreground">{selectedIds.size} selected</span>
      <span className="text-muted-foreground/40">·</span>
      <span className="text-[12px] text-muted-foreground">Set status to:</span>
      {STATUS_OPTIONS.map(opt => {
        const s = STATUS_STYLES[opt.value] ?? STATUS_STYLES.DRAFT
        return (
          <button key={opt.value} disabled={isPending} onClick={() => applyStatus(opt.value as "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "REJECTED")}
            className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[11px] font-semibold border transition-colors disabled:opacity-50 ${s.trigger}`}>
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />}
            {opt.label}
          </button>
        )
      })}
      <button onClick={onDone} className="ml-auto text-[12px] text-muted-foreground hover:text-foreground transition-colors">Clear selection</button>
    </div>
  )
}

interface Props {
  listings: Listing[]
  sellerId: string
}

export function AdminSellerListingsPage({ listings, sellerId }: Props) {
  const router = useRouter()
  const [filterBrand,     setFilterBrand]     = useState<string | null>(null)
  const [filterStatus,    setFilterStatus]    = useState<string | null>(null)
  const [filterCondition, setFilterCondition] = useState<string | null>(null)
  const [filterUpload,    setFilterUpload]    = useState<string | null>(null)
  const [selectedIds,     setSelectedIds]     = useState<Set<string>>(new Set())

  const anyFilter = !!(filterBrand || filterStatus || filterCondition || filterUpload)

  const brandOptions = useMemo(() => {
    const names = [...new Set(listings.map(l => l.variant.phone.brand.name))].sort()
    return names.map(n => ({ value: n, label: n }))
  }, [listings])

  const filtered = useMemo(() => {
    let r = listings
    if (filterBrand)     r = r.filter(l => l.variant.phone.brand.name === filterBrand)
    if (filterStatus)    r = r.filter(l => l.status === filterStatus)
    if (filterCondition) r = r.filter(l => l.condition === filterCondition)
    if (filterUpload)    r = r.filter(l => l.uploadType === filterUpload)
    return r
  }, [listings, filterBrand, filterStatus, filterCondition, filterUpload])

  function toggleRow(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) { n.delete(id) } else { n.add(id) }; return n })
  }
  function toggleAll() {
    const all = filtered.every(l => selectedIds.has(l.id))
    if (all) setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(l => n.delete(l.id)); return n })
    else setSelectedIds(prev => new Set([...prev, ...filtered.map(l => l.id)]))
  }

  const allSelected  = filtered.length > 0 && filtered.every(l => selectedIds.has(l.id))
  const someSelected = !allSelected && filtered.some(l => selectedIds.has(l.id))

  if (listings.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Package className="h-10 w-10 opacity-20" />
          <p className="text-[13px]">No listings submitted yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-wrap">
        <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <FilterDropdown label="Brand"     options={brandOptions}      value={filterBrand}     onChange={setFilterBrand} />
        <FilterDropdown label="Status"    options={STATUS_OPTIONS}     value={filterStatus}    onChange={setFilterStatus} />
        <FilterDropdown label="Condition" options={CONDITION_OPTIONS}  value={filterCondition} onChange={setFilterCondition} />
        <FilterDropdown label="Source"    options={UPLOAD_OPTIONS}     value={filterUpload}    onChange={setFilterUpload} />
        {anyFilter && (
          <button onClick={() => { setFilterBrand(null); setFilterStatus(null); setFilterCondition(null); setFilterUpload(null) }}
            className="inline-flex items-center gap-1 h-8 px-3 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
            <RotateCcw className="h-3 w-3" /> Clear
          </button>
        )}
        <span className="ml-auto text-[12px] text-muted-foreground">{filtered.length} of {listings.length} listings</span>
      </div>

      {selectedIds.size > 0 && (
        <BulkBar selectedIds={selectedIds} listings={filtered} sellerId={sellerId} onDone={() => setSelectedIds(new Set())} />
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="py-3 pl-4 pr-2 w-8">
                <input type="checkbox" checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected }}
                  onChange={toggleAll} onClick={e => e.stopPropagation()}
                  className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer" />
              </th>
              {["Phone", "Variant", "Condition", "Price", "Stock", "SKU", "Source", "Status", "Date", ""].map(h => (
                <th key={h} className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(listing => {
              const date = new Date(listing.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
              const isSelected = selectedIds.has(listing.id)
              return (
                <tr key={listing.id}
                  onClick={() => router.push(`/admin/marketplace/sellers/new-phones/${sellerId}/${listing.id}`)}
                  className={`transition-colors group cursor-pointer ${isSelected ? "bg-primary/5 hover:bg-primary/8" : "hover:bg-muted/20"}`}>
                  <td className="py-3.5 pl-4 pr-2" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleRow(listing.id)}
                      className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer" />
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      {listing.variant.phone.images[0] && (
                        <img src={listing.variant.phone.images[0].url} alt={listing.variant.phone.name}
                          className="h-8 w-8 rounded-lg object-cover border border-border flex-shrink-0" />
                      )}
                      <p className="font-medium text-foreground">{listing.variant.phone.brand.name} {listing.variant.phone.name}</p>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <p className="text-foreground">{listing.variant.ram}GB / {listing.variant.storage >= 1024 ? `${listing.variant.storage / 1024}TB` : `${listing.variant.storage}GB`}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {listing.variant.colorHex && <span className="h-2.5 w-2.5 rounded-full border border-border/50" style={{ background: listing.variant.colorHex }} />}
                      <span className="text-[11px] text-muted-foreground">{listing.variant.color}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border">
                      {listing.condition === "SEALED" ? "Sealed" : "Open Box"}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-medium text-foreground">₹{listing.price.toLocaleString("en-IN")}</td>
                  <td className="py-3.5 px-3 text-muted-foreground">{listing.stock} pcs</td>
                  <td className="py-3.5 px-3 font-mono text-[11px] text-muted-foreground">{listing.sku ?? "—"}</td>
                  <td className="py-3.5 px-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border">
                      {listing.uploadType === "CSV" ? "CSV" : "Manual"}
                    </span>
                  </td>
                  <td className="py-3.5 px-3" onClick={e => e.stopPropagation()}>
                    <StatusSelect listingId={listing.id} sellerId={sellerId} current={listing.status} />
                  </td>
                  <td className="py-3.5 px-3 text-[12px] text-muted-foreground whitespace-nowrap">{date}</td>
                  <td className="py-3.5 px-3">
                    <span className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground group-hover:text-primary transition-colors whitespace-nowrap">
                      View <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
