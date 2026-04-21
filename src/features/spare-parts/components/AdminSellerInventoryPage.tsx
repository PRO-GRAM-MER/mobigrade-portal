"use client"

import { useState, useMemo, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  SlidersHorizontal, Package, RotateCcw, ChevronRight,
  Wand2, Loader2, AlertCircle, CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarFilter } from "./CalendarFilter"
import { BrandModelFilter, type BrandOption } from "./BrandModelFilter"
import { FilterDropdown } from "./FilterDropdown"
import { PART_CATEGORIES } from "../schemas"
import { updateSparePartStatusAction, enrichSparePartAction } from "../admin-actions"

type Part = {
  id: string
  name: string
  category: string
  qualityGrade: string
  status: string
  uploadType: string
  price: number
  discountedPrice: number
  quantity: number
  enrichedAt: string | null
  deployedAt: string | null
  createdAt: string
  models: { id: string; name: string; brand: { id: string; name: string } }[]
}

type EnrichRowState = "idle" | "running" | "done" | "error"

interface EnrichSession {
  active: boolean
  stateById: Map<string, EnrichRowState>
  total: number
  done: number
}

const STATUS_OPTIONS = [
  { value: "PENDING_REVIEW", label: "Pending Review" },
  { value: "ACTIVE",         label: "Active"         },
  { value: "REJECTED",       label: "Rejected"       },
  { value: "DRAFT",          label: "Draft"          },
]

const STATUS_STYLES: Record<string, { dot: string; trigger: string }> = {
  PENDING_REVIEW: {
    dot: "bg-amber-500",
    trigger: "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/15",
  },
  ACTIVE: {
    dot: "bg-emerald-500",
    trigger: "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/15",
  },
  REJECTED: {
    dot: "bg-red-500",
    trigger: "border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/15",
  },
  DRAFT: {
    dot: "bg-muted-foreground/40",
    trigger: "border-border bg-muted/40 text-muted-foreground hover:bg-muted/60",
  },
}

const UPLOAD_TYPE_OPTIONS = [
  { value: "CSV",    label: "CSV Upload" },
  { value: "MANUAL", label: "Manual"     },
]

const CATEGORY_OPTIONS = PART_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))

type AdminStatus = "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "REJECTED"

// ── Per-row status pill ──────────────────────────────────────────────────────

function StatusSelect({
  partId, sellerId, current,
}: { partId: string; sellerId: string; current: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const style = STATUS_STYLES[current] ?? STATUS_STYLES.DRAFT
  const label = STATUS_OPTIONS.find((s) => s.value === current)?.label ?? current

  return (
    <Select
      value={current}
      onValueChange={(val) =>
        startTransition(async () => {
          const res = await updateSparePartStatusAction(partId, val as AdminStatus, sellerId)
          if (res.success) { toast.success(res.message); router.refresh() }
          else toast.error(res.error ?? "Failed")
        })
      }
    >
      <SelectTrigger
        onClick={(e) => e.stopPropagation()}
        disabled={isPending}
        className={`h-7 w-[148px] text-[12px] font-semibold border rounded-full px-3 gap-2
          focus:ring-0 focus:ring-offset-0 shadow-none disabled:opacity-60 transition-colors ${style.trigger}`}
      >
        {isPending
          ? <Loader2 className="h-3 w-3 animate-spin" />
          : <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${style.dot}`} />}
        <SelectValue>{label}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start" className="min-w-[160px]">
        {STATUS_OPTIONS.map((opt) => {
          const s = STATUS_STYLES[opt.value] ?? STATUS_STYLES.DRAFT
          return (
            <SelectItem key={opt.value} value={opt.value}>
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
                {opt.label}
              </div>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

// ── Bulk action bar (shown when rows selected) ───────────────────────────────

interface BulkBarProps {
  selectedIds: Set<string>
  parts: Part[]
  sellerId: string
  onDone: () => void
}

function BulkBar({ selectedIds, parts, sellerId, onDone }: BulkBarProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const count = selectedIds.size

  function applyStatus(status: AdminStatus) {
    const targets = parts.filter((p) => selectedIds.has(p.id))
    startTransition(async () => {
      let ok = 0
      for (const p of targets) {
        const res = await updateSparePartStatusAction(p.id, status, sellerId)
        if (res.success) ok++
      }
      toast.success(`${ok} of ${targets.length} part${targets.length !== 1 ? "s" : ""} set to ${STATUS_OPTIONS.find(s => s.value === status)?.label}`)
      router.refresh()
      onDone()
    })
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border-b border-primary/15">
      <span className="text-[13px] font-semibold text-foreground">
        {count} selected
      </span>
      <span className="text-muted-foreground/40 text-[12px]">·</span>
      <span className="text-[12px] text-muted-foreground">Set status to:</span>

      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUS_OPTIONS.map((opt) => {
          const s = STATUS_STYLES[opt.value] ?? STATUS_STYLES.DRAFT
          return (
            <button
              key={opt.value}
              disabled={isPending}
              onClick={() => applyStatus(opt.value as AdminStatus)}
              className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[11px] font-semibold
                border transition-colors disabled:opacity-50 ${s.trigger}`}
            >
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />}
              {opt.label}
            </button>
          )
        })}
      </div>

      <button
        onClick={onDone}
        className="ml-auto text-[12px] text-muted-foreground hover:text-foreground transition-colors"
      >
        Clear selection
      </button>
    </div>
  )
}

// ── Table ────────────────────────────────────────────────────────────────────

interface PartsTableProps {
  parts: Part[]
  sellerId: string
  enrichSession: EnrichSession
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onToggleAll: () => void
}

function PartsTable({ parts, sellerId, enrichSession, selectedIds, onToggle, onToggleAll }: PartsTableProps) {
  const router = useRouter()
  const allSelected = parts.length > 0 && parts.every((p) => selectedIds.has(p.id))
  const someSelected = !allSelected && parts.some((p) => selectedIds.has(p.id))

  if (parts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <Package className="h-10 w-10 opacity-20" />
        <p className="text-[13px]">No parts match the current filters.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border bg-muted/20">
            {/* Select all */}
            <th className="py-3 pl-4 pr-2 w-8">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected }}
                onChange={onToggleAll}
                onClick={(e) => e.stopPropagation()}
                className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
              />
            </th>
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-3">Part</th>
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-3">Brand / Model</th>
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-3">Price</th>
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-3">Qty</th>
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-3">Source</th>
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-3">Status</th>
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-3">Date</th>
            <th className="py-3 px-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {parts.map((part) => {
            const brands = [...new Set(part.models.map((m) => m.brand.name))]
            const modelStr = part.models.length === 0 ? "—"
              : part.models.length === 1 ? part.models[0].name
              : `${part.models[0].name} +${part.models.length - 1}`
            const date = new Date(part.createdAt).toLocaleDateString("en-IN", {
              day: "numeric", month: "short", year: "numeric",
            })
            const rowEnrich = enrichSession.stateById.get(part.id) ?? "idle"
            const isEnriched = !!part.enrichedAt || rowEnrich === "done"
            const isSelected = selectedIds.has(part.id)

            return (
              <tr
                key={part.id}
                onClick={() => router.push(`/admin/marketplace/sellers/spare-parts/${sellerId}/${part.id}`)}
                className={`transition-colors group cursor-pointer
                  ${isSelected ? "bg-primary/5" : ""}
                  ${rowEnrich === "running" && !isSelected ? "bg-amber-50 dark:bg-amber-500/5" : ""}
                  ${rowEnrich === "done" && !isSelected ? "bg-emerald-50/50 dark:bg-emerald-500/5" : ""}
                  ${rowEnrich === "error" && !isSelected ? "bg-red-50/50 dark:bg-red-500/5" : ""}
                  ${!isSelected ? "hover:bg-muted/20" : "hover:bg-primary/8"}
                `}
              >
                {/* Checkbox */}
                <td className="py-3.5 pl-4 pr-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(part.id)}
                    className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                  />
                </td>

                <td className="py-3.5 px-3">
                  <div className="flex items-center gap-2">
                    {rowEnrich === "running" && <Loader2 className="h-3.5 w-3.5 text-amber-500 animate-spin flex-shrink-0" />}
                    {rowEnrich === "done"    && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />}
                    {rowEnrich === "error"   && <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                    {rowEnrich === "idle" && isEnriched && <Wand2 className="h-3.5 w-3.5 text-primary/40 flex-shrink-0" />}
                    <div>
                      <p className="font-medium text-foreground leading-snug">{part.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{part.category.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                </td>

                <td className="py-3.5 px-3">
                  <p className="text-foreground">{brands.length <= 2 ? brands.join(", ") : `${brands[0]} +${brands.length - 1}`}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{modelStr}</p>
                </td>

                <td className="py-3.5 px-3">
                  <span className="font-medium text-foreground">₹{part.discountedPrice.toLocaleString("en-IN")}</span>
                  {part.price !== part.discountedPrice && (
                    <span className="ml-1.5 text-[11px] text-muted-foreground/50 line-through">
                      ₹{part.price.toLocaleString("en-IN")}
                    </span>
                  )}
                </td>

                <td className="py-3.5 px-3 text-muted-foreground">{part.quantity} pcs</td>

                <td className="py-3.5 px-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border">
                    {part.uploadType === "CSV" ? "CSV" : "Manual"}
                  </span>
                </td>

                <td className="py-3.5 px-3" onClick={(e) => e.stopPropagation()}>
                  <StatusSelect partId={part.id} sellerId={sellerId} current={part.status} />
                </td>

                <td className="py-3.5 px-3 text-[12px] text-muted-foreground whitespace-nowrap">{date}</td>

                <td className="py-3.5 px-3">
                  <span className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground group-hover:text-primary transition-colors whitespace-nowrap">
                    View details
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  parts: Part[]
  sellerId: string
}

const EMPTY_SESSION: EnrichSession = {
  active: false,
  stateById: new Map(),
  total: 0,
  done: 0,
}

export function AdminSellerInventoryPage({ parts, sellerId }: Props) {
  const router = useRouter()

  const [filterDate, setFilterDate] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [filterBrand, setFilterBrand] = useState<string | null>(null)
  const [filterModelId, setFilterModelId] = useState<string | null>(null)
  const [filterModelName, setFilterModelName] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [filterUpload, setFilterUpload] = useState<string | null>(null)
  const [enrichSession, setEnrichSession] = useState<EnrichSession>(EMPTY_SESSION)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const anyFilter = !!(filterDate || filterCategory || filterBrand || filterStatus || filterUpload)

  function clearFilters() {
    setFilterDate(null); setFilterCategory(null)
    setFilterBrand(null); setFilterModelId(null); setFilterModelName(null)
    setFilterStatus(null); setFilterUpload(null)
  }

  const dateCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of parts) {
      const key = new Date(p.createdAt).toISOString().split("T")[0]
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [parts])

  const availableBrands = useMemo<BrandOption[]>(() => {
    const bm = new Map<string, Map<string, string>>()
    for (const p of parts) {
      for (const m of p.models) {
        if (!bm.has(m.brand.name)) bm.set(m.brand.name, new Map())
        bm.get(m.brand.name)!.set(m.id, m.name)
      }
    }
    return [...bm.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, models]) => ({
        name,
        models: [...models.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
      }))
  }, [parts])

  const filtered = useMemo(() => {
    let r = parts
    if (filterDate)     r = r.filter((p) => new Date(p.createdAt).toISOString().split("T")[0] === filterDate)
    if (filterCategory) r = r.filter((p) => p.category === filterCategory)
    if (filterModelId)  r = r.filter((p) => p.models.some((m) => m.id === filterModelId))
    else if (filterBrand) r = r.filter((p) => p.models.some((m) => m.brand.name === filterBrand))
    if (filterStatus)   r = r.filter((p) => p.status === filterStatus)
    if (filterUpload)   r = r.filter((p) => p.uploadType === filterUpload)
    return r
  }, [parts, filterDate, filterCategory, filterBrand, filterModelId, filterStatus, filterUpload])

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  function toggleAll() {
    const allSelected = filtered.every((p) => selectedIds.has(p.id))
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        filtered.forEach((p) => next.delete(p.id))
        return next
      })
    } else {
      setSelectedIds((prev) => new Set([...prev, ...filtered.map((p) => p.id)]))
    }
  }

  const handleEnrichAll = useCallback(async () => {
    if (enrichSession.active) return
    const toProcess = filtered
    if (toProcess.length === 0) return

    const initialMap = new Map<string, EnrichRowState>()
    for (const p of toProcess) initialMap.set(p.id, "idle")
    setEnrichSession({ active: true, stateById: initialMap, total: toProcess.length, done: 0 })

    let successCount = 0
    let errorCount = 0
    const stateMap = new Map(initialMap)

    for (const part of toProcess) {
      stateMap.set(part.id, "running")
      setEnrichSession((s) => ({ ...s, stateById: new Map(stateMap) }))
      const res = await enrichSparePartAction(part.id, sellerId)
      stateMap.set(part.id, res.success ? "done" : "error")
      if (res.success) { successCount++ } else { errorCount++ }
      setEnrichSession((s) => ({ ...s, stateById: new Map(stateMap), done: successCount + errorCount }))
    }

    setEnrichSession((s) => ({ ...s, active: false }))
    if (successCount > 0) toast.success(`${successCount} part${successCount !== 1 ? "s" : ""} enriched`)
    if (errorCount > 0)   toast.error(`${errorCount} failed — check parts with no linked model`)
    router.refresh()
  }, [enrichSession.active, filtered, sellerId, router])

  const enrichProgress = enrichSession.active ? `${enrichSession.done} / ${enrichSession.total}` : null

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      {/* Filter toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-wrap">
        <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

        <CalendarFilter dateCounts={dateCounts} selected={filterDate} onChange={setFilterDate} />
        <FilterDropdown label="Category" options={CATEGORY_OPTIONS} value={filterCategory} onChange={setFilterCategory} width="min-w-[200px]" />
        <BrandModelFilter
          brands={availableBrands}
          selectedBrand={filterBrand}
          selectedModelId={filterModelId}
          selectedModelName={filterModelName}
          onChange={(brand, modelId, modelName) => { setFilterBrand(brand); setFilterModelId(modelId); setFilterModelName(modelName) }}
        />
        <FilterDropdown label="Status"  options={STATUS_OPTIONS}      value={filterStatus} onChange={setFilterStatus} />
        <FilterDropdown label="Source"  options={UPLOAD_TYPE_OPTIONS}  value={filterUpload} onChange={setFilterUpload} />
        {anyFilter && (
          <button onClick={clearFilters}
            className="inline-flex items-center gap-1 h-8 px-3 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
            <RotateCcw className="h-3 w-3" /> Clear
          </button>
        )}

        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <span className="text-[12px] text-muted-foreground">{filtered.length} of {parts.length} parts</span>

          <button
            disabled={enrichSession.active || filtered.length === 0}
            onClick={handleEnrichAll}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-semibold rounded-lg
              border border-border bg-muted/40 text-foreground hover:bg-muted
              transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enrichSession.active
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enriching {enrichProgress}</>
              : <><Wand2 className="h-3.5 w-3.5" /> Enrich All</>
            }
          </button>
        </div>
      </div>

      {/* Bulk action bar — shown when rows selected */}
      {selectedIds.size > 0 && (
        <BulkBar
          selectedIds={selectedIds}
          parts={filtered}
          sellerId={sellerId}
          onDone={() => setSelectedIds(new Set())}
        />
      )}

      <PartsTable
        parts={filtered}
        sellerId={sellerId}
        enrichSession={enrichSession}
        selectedIds={selectedIds}
        onToggle={toggleRow}
        onToggleAll={toggleAll}
      />
    </div>
  )
}
