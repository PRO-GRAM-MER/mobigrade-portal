"use client"

import { useState, useMemo, useRef, useTransition, useEffect } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import {
  Upload, Trash2, X, AlertTriangle, Loader2, History,
  FileUp, CheckCircle2, SlidersHorizontal, Package, RotateCcw
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { CalendarFilter } from "./CalendarFilter"
import { BrandModelFilter, type BrandOption } from "./BrandModelFilter"
import { FilterDropdown } from "./FilterDropdown"
import { uploadSparePartsCSVAction, deletePendingCSVUploadsAction, type CSVUploadResult } from "../actions"
import { PART_CATEGORIES } from "../schemas"

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
  createdAt: string
  models: { id: string; name: string; brand: { id: string; name: string } }[]
}

type Tab = "history" | "upload"

const STATUS_OPTIONS = [
  { value: "PENDING_REVIEW", label: "Pending Review", dot: "bg-amber-500" },
  { value: "ACTIVE",         label: "Active",         dot: "bg-emerald-500" },
  { value: "REJECTED",       label: "Rejected",       dot: "bg-red-500" },
  { value: "DRAFT",          label: "Draft",          dot: "bg-muted-foreground/40" },
]

const CATEGORY_OPTIONS = PART_CATEGORIES.map(c => ({ value: c.value, label: c.label }))

const STATUS_UI: Record<string, { label: string; dot: string; cls: string }> = {
  DRAFT:          { label: "Draft",          dot: "bg-muted-foreground/40", cls: "bg-muted/60 text-muted-foreground border-border" },
  PENDING_REVIEW: { label: "Pending Review", dot: "bg-amber-500",           cls: "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/25" },
  ACTIVE:         { label: "Active",         dot: "bg-emerald-500",         cls: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/25" },
  REJECTED:       { label: "Rejected",       dot: "bg-red-500",             cls: "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/25" },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_UI[status] ?? STATUS_UI.DRAFT
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function UploadTypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border">
      {type === "CSV" ? "CSV" : "Manual"}
    </span>
  )
}

function ErrorModal({ result, onClose }: { result: CSVUploadResult; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", h)
    return () => document.removeEventListener("keydown", h)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10">
              <AlertTriangle className="h-4.5 w-4.5 text-destructive" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-foreground">Upload Failed</p>
              <p className="text-[12px] text-muted-foreground">{result.errors.length} error{result.errors.length !== 1 ? "s" : ""} found — fix all rows and re-upload</p>
            </div>
          </div>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-muted/30 border-b border-border backdrop-blur-sm">
              <tr>
                <th className="text-left text-[11px] font-semibold text-muted-foreground py-2.5 px-6 w-20 uppercase tracking-wider">Row</th>
                <th className="text-left text-[11px] font-semibold text-muted-foreground py-2.5 px-4 uppercase tracking-wider">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {result.errors.map((e, i) => (
                <tr key={i} className="hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-6 font-mono text-[12px] text-muted-foreground">{e.row}</td>
                  <td className="py-2.5 px-4 text-destructive text-[12px]">{e.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-border flex-shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function PartsTable({ parts, emptyText = "No parts found." }: { parts: Part[]; emptyText?: string }) {
  if (parts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <Package className="h-10 w-10 opacity-20" />
        <p className="text-[13px]">{emptyText}</p>
      </div>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border bg-muted/20">
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Part</th>
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Brand</th>
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Models</th>
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Price</th>
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Qty</th>
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Source</th>
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Status</th>
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {parts.map(part => {
            const brands = [...new Set(part.models.map(m => m.brand.name))]
            const date = new Date(part.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
            return (
              <tr key={part.id} className="hover:bg-muted/20 transition-colors group">
                <td className="py-3.5 px-4">
                  <p className="font-medium text-foreground text-[13px]">{part.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{part.category.replace(/_/g, " ")}</p>
                </td>
                <td className="py-3.5 px-4 text-muted-foreground">
                  {brands.length <= 2 ? brands.join(", ") : `${brands[0]} +${brands.length - 1}`}
                </td>
                <td className="py-3.5 px-4 text-muted-foreground">
                  {part.models.length === 0 ? "—"
                    : part.models.length === 1 ? part.models[0].name
                    : `${part.models[0].name} +${part.models.length - 1}`}
                </td>
                <td className="py-3.5 px-4">
                  <span className="font-medium text-foreground">₹{Number(part.discountedPrice).toLocaleString("en-IN")}</span>
                  {Number(part.price) !== Number(part.discountedPrice) && (
                    <span className="ml-1.5 text-[11px] text-muted-foreground/50 line-through">₹{Number(part.price).toLocaleString("en-IN")}</span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-muted-foreground">{part.quantity} pcs</td>
                <td className="py-3.5 px-4"><UploadTypeBadge type={part.uploadType} /></td>
                <td className="py-3.5 px-4"><StatusBadge status={part.status} /></td>
                <td className="py-3.5 px-4 text-[12px] text-muted-foreground whitespace-nowrap">{date}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  parts: Part[]
  hasPendingUploads: boolean
}

export function SellerInventoryPage({ parts, hasPendingUploads }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [isWorking, startTransition] = useTransition()
  const [tab, setTab] = useState<Tab>("history")
  const [errorModal, setErrorModal] = useState<CSVUploadResult | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [hasUploads, setHasUploads] = useState(hasPendingUploads)
  const [lastUpload, setLastUpload] = useState<{ count: number; dateKey: string } | null>(null)
  const [dragging, setDragging] = useState(false)

  // Filters (history tab only)
  const [filterDate, setFilterDate] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [filterBrand, setFilterBrand] = useState<string | null>(null)
  const [filterModelId, setFilterModelId] = useState<string | null>(null)
  const [filterModelName, setFilterModelName] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)

  const anyFilter = !!(filterDate || filterCategory || filterBrand || filterStatus)

  function clearFilters() {
    setFilterDate(null); setFilterCategory(null)
    setFilterBrand(null); setFilterModelId(null); setFilterModelName(null)
    setFilterStatus(null)
  }

  // Derived data from parts
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

  // Filtered parts for history tab
  const historyParts = useMemo(() => {
    let r = parts
    if (filterDate) r = r.filter(p => new Date(p.createdAt).toISOString().split("T")[0] === filterDate)
    if (filterCategory) r = r.filter(p => p.category === filterCategory)
    if (filterModelId) r = r.filter(p => p.models.some(m => m.id === filterModelId))
    else if (filterBrand) r = r.filter(p => p.models.some(m => m.brand.name === filterBrand))
    if (filterStatus) r = r.filter(p => p.status === filterStatus)
    return r
  }, [parts, filterDate, filterCategory, filterBrand, filterModelId, filterStatus])

  // Today's CSV uploads (for upload tab)
  const todayCSVParts = useMemo(() => {
    const today = new Date().toISOString().split("T")[0]
    return parts.filter(p =>
      new Date(p.createdAt).toISOString().split("T")[0] === today &&
      p.uploadType === "CSV"
    )
  }, [parts])

  // Upload handlers
  function processFile(file: File) {
    if (!file.name.endsWith(".csv")) { toast.error("Upload a .csv file"); return }
    if (file.size > 10 * 1024 * 1024) { toast.error("File too large — max 10 MB"); return }
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      startTransition(async () => {
        setErrorModal(null)
        const res = await uploadSparePartsCSVAction(text)
        if (!res.success) { toast.error(res.error ?? "Upload failed"); return }
        const data = res.data!
        if (data.errors.length > 0) {
          setErrorModal(data)
        } else {
          const dateKey = new Date().toISOString().split("T")[0]
          setLastUpload({ count: data.created, dateKey })
          setHasUploads(true)
          router.refresh()
        }
      })
    }
    reader.readAsText(file)
  }

  function handleClear() {
    if (!confirmClear) { setConfirmClear(true); return }
    startTransition(async () => {
      const res = await deletePendingCSVUploadsAction()
      setConfirmClear(false)
      if (res.success) {
        toast.success(res.message ?? "Cleared")
        setHasUploads(false)
        setLastUpload(null)
        router.refresh()
      } else {
        toast.error(res.error ?? "Delete failed")
      }
    })
  }

  // Drag & drop
  function onDragOver(e: React.DragEvent) { e.preventDefault(); setDragging(true) }
  function onDragLeave() { setDragging(false) }
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  return (
    <>
      {/* Tab switcher */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {/* Tab buttons */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setTab("history")}
            className={`flex items-center gap-2 px-6 py-4 text-[13px] font-semibold border-b-2 transition-all ${
              tab === "history"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="h-4 w-4" />
            Previous Uploads
            {parts.length > 0 && (
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${tab === "history" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                {parts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("upload")}
            className={`flex items-center gap-2 px-6 py-4 text-[13px] font-semibold border-b-2 transition-all ${
              tab === "upload"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileUp className="h-4 w-4" />
            Upload CSV
            {lastUpload && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                {lastUpload.count} new
              </span>
            )}
          </button>
        </div>

        {/* ── HISTORY TAB ────────────────────────────────────────────── */}
        {tab === "history" && (
          <>
            {/* Filter bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-wrap">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <CalendarFilter
                dateCounts={dateCounts}
                selected={filterDate}
                onChange={setFilterDate}
              />
              <FilterDropdown
                label="Category"
                options={CATEGORY_OPTIONS}
                value={filterCategory}
                onChange={setFilterCategory}
                width="min-w-[200px]"
              />
              <BrandModelFilter
                brands={availableBrands}
                selectedBrand={filterBrand}
                selectedModelId={filterModelId}
                selectedModelName={filterModelName}
                onChange={(brand, modelId, modelName) => {
                  setFilterBrand(brand)
                  setFilterModelId(modelId)
                  setFilterModelName(modelName)
                }}
              />
              <FilterDropdown
                label="Status"
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
                {historyParts.length} of {parts.length} parts
              </span>
            </div>

            <PartsTable
              parts={historyParts}
              emptyText={anyFilter ? "No parts match the current filters." : "No uploads yet."}
            />
          </>
        )}

        {/* ── UPLOAD TAB ─────────────────────────────────────────────── */}
        {tab === "upload" && (
          <div className="p-6 space-y-6">
            {/* Success banner */}
            {lastUpload && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-emerald-800 dark:text-emerald-300">
                    {lastUpload.count} part{lastUpload.count !== 1 ? "s" : ""} uploaded successfully
                  </p>
                  <p className="text-[12px] text-emerald-700/70 dark:text-emerald-400/70 mt-0.5">
                    All parts are pending admin review — visible below
                  </p>
                </div>
                <button onClick={() => setLastUpload(null)} className="text-emerald-600/50 hover:text-emerald-600 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Drop zone */}
            <div
              ref={dropRef}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-all ${
                dragging
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : isWorking
                  ? "border-border bg-muted/30 cursor-not-allowed"
                  : "border-border hover:border-primary/40 hover:bg-muted/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = "" }}
                disabled={isWorking}
              />
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border border-border shadow-sm transition-colors ${dragging ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                {isWorking
                  ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  : <Upload className={`h-6 w-6 ${dragging ? "text-primary-foreground" : "text-muted-foreground"}`} />
                }
              </div>
              <div className="text-center space-y-1">
                <p className="text-[14px] font-semibold text-foreground">
                  {isWorking ? "Uploading…" : dragging ? "Drop your CSV" : "Drop CSV here or click to browse"}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  Max 10 MB · Max 5000 rows · All columns required
                </p>
              </div>
            </div>

            {/* Clear button — only if has pending uploads */}
            {hasUploads && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isWorking}
                  onClick={handleClear}
                  onBlur={() => setConfirmClear(false)}
                  className={`text-[13px] ${confirmClear ? "border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive" : ""}`}
                >
                  {isWorking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  {confirmClear ? "Confirm — delete all pending CSV uploads?" : "Clear pending CSV uploads"}
                </Button>
                {confirmClear && (
                  <button onClick={() => setConfirmClear(false)} className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                    Cancel
                  </button>
                )}
              </div>
            )}

            {/* Today's uploaded parts */}
            {todayCSVParts.length > 0 && (
              <div className="border border-border rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b border-border">
                  <p className="text-[13px] font-semibold text-foreground">Today&apos;s Uploaded Parts</p>
                  <span className="text-[11px] text-muted-foreground">{todayCSVParts.length} parts · No filters</span>
                </div>
                <PartsTable parts={todayCSVParts} />
              </div>
            )}
          </div>
        )}
      </div>

      {errorModal && <ErrorModal result={errorModal} onClose={() => setErrorModal(null)} />}
    </>
  )
}
