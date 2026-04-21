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
import { FilterDropdown } from "@/features/spare-parts/components/FilterDropdown"
import { uploadPhoneListingsCSVAction, deletePendingPhoneCSVListingsAction, type CSVUploadResult } from "../seller-actions"

type Listing = {
  id: string
  price: number
  stock: number
  sku: string | null
  condition: string
  warrantyMonths: number | null
  status: string
  uploadType: string
  createdAt: string
  variant: {
    id: string
    ram: number
    storage: number
    color: string
    colorHex: string | null
    phone: { id: string; name: string; brand: { id: string; name: string } }
  }
}

type Tab = "history" | "upload"

const STATUS_OPTIONS = [
  { value: "PENDING_REVIEW", label: "Pending Review", dot: "bg-amber-500" },
  { value: "ACTIVE",         label: "Active",         dot: "bg-emerald-500" },
  { value: "REJECTED",       label: "Rejected",       dot: "bg-red-500" },
  { value: "DRAFT",          label: "Draft",          dot: "bg-muted-foreground/40" },
]

const STATUS_UI: Record<string, { label: string; dot: string; cls: string }> = {
  DRAFT:          { label: "Draft",          dot: "bg-muted-foreground/40", cls: "bg-muted/60 text-muted-foreground border-border" },
  PENDING_REVIEW: { label: "Pending Review", dot: "bg-amber-500",           cls: "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/25" },
  ACTIVE:         { label: "Active",         dot: "bg-emerald-500",         cls: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/25" },
  REJECTED:       { label: "Rejected",       dot: "bg-red-500",             cls: "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/25" },
}

const CONDITION_OPTIONS = [
  { value: "SEALED",   label: "Factory Sealed" },
  { value: "OPEN_BOX", label: "Open Box"        },
]

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_UI[status] ?? STATUS_UI.DRAFT
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-foreground">Upload Failed</p>
              <p className="text-[12px] text-muted-foreground">{result.errors.length} error{result.errors.length !== 1 ? "s" : ""} — fix and re-upload</p>
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

function ListingsTable({ listings }: { listings: Listing[] }) {
  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
        <Package className="h-10 w-10 opacity-20" />
        <p className="text-[13px]">No listings found.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border bg-muted/20">
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Phone</th>
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Variant</th>
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Condition</th>
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Price</th>
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Stock</th>
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">SKU</th>
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Source</th>
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Status</th>
            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 px-4">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {listings.map(l => {
            const date = new Date(l.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
            return (
              <tr key={l.id} className="hover:bg-muted/20 transition-colors">
                <td className="py-3.5 px-4">
                  <p className="font-medium text-foreground">{l.variant.phone.brand.name} {l.variant.phone.name}</p>
                </td>
                <td className="py-3.5 px-4">
                  <p className="text-foreground">{l.variant.ram}GB RAM / {l.variant.storage >= 1024 ? `${l.variant.storage / 1024}TB` : `${l.variant.storage}GB`}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {l.variant.colorHex && <span className="h-3 w-3 rounded-full border border-border/50" style={{ background: l.variant.colorHex }} />}
                    <p className="text-[11px] text-muted-foreground">{l.variant.color}</p>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border">
                    {l.condition === "SEALED" ? "Sealed" : "Open Box"}
                  </span>
                </td>
                <td className="py-3.5 px-4 font-medium text-foreground">₹{l.price.toLocaleString("en-IN")}</td>
                <td className="py-3.5 px-4 text-muted-foreground">{l.stock} pcs</td>
                <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">{l.sku ?? "—"}</td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border">
                    {l.uploadType === "CSV" ? "CSV" : "Manual"}
                  </span>
                </td>
                <td className="py-3.5 px-4"><StatusBadge status={l.status} /></td>
                <td className="py-3.5 px-4 text-[12px] text-muted-foreground whitespace-nowrap">{date}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

interface Props {
  listings: Listing[]
  hasPendingUploads: boolean
}

export function SellerPhoneListingsPage({ listings, hasPendingUploads }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isWorking, startTransition] = useTransition()
  const [tab, setTab] = useState<Tab>("history")
  const [errorModal, setErrorModal] = useState<CSVUploadResult | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [hasUploads, setHasUploads] = useState(hasPendingUploads)
  const [lastUpload, setLastUpload] = useState<{ count: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  const [filterBrand,    setFilterBrand]    = useState<string | null>(null)
  const [filterStatus,   setFilterStatus]   = useState<string | null>(null)
  const [filterCondition,setFilterCondition]= useState<string | null>(null)

  const anyFilter = !!(filterBrand || filterStatus || filterCondition)

  const brandOptions = useMemo(() => {
    const names = [...new Set(listings.map(l => l.variant.phone.brand.name))].sort()
    return names.map(n => ({ value: n, label: n }))
  }, [listings])

  const filtered = useMemo(() => {
    let r = listings
    if (filterBrand)     r = r.filter(l => l.variant.phone.brand.name === filterBrand)
    if (filterStatus)    r = r.filter(l => l.status === filterStatus)
    if (filterCondition) r = r.filter(l => l.condition === filterCondition)
    return r
  }, [listings, filterBrand, filterStatus, filterCondition])

  const todayCSV = useMemo(() => {
    const today = new Date().toISOString().split("T")[0]
    return listings.filter(l => new Date(l.createdAt).toISOString().split("T")[0] === today && l.uploadType === "CSV")
  }, [listings])

  function processFile(file: File) {
    if (!file.name.endsWith(".csv")) { toast.error("Upload a .csv file"); return }
    if (file.size > 10 * 1024 * 1024) { toast.error("File too large — max 10 MB"); return }
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      startTransition(async () => {
        const res = await uploadPhoneListingsCSVAction(text)
        if (!res.success) { toast.error(res.error ?? "Upload failed"); return }
        const data = res.data!
        if (data.errors.length > 0) { setErrorModal(data) }
        else { setLastUpload({ count: data.created }); setHasUploads(true); router.refresh() }
      })
    }
    reader.readAsText(file)
  }

  function handleClear() {
    if (!confirmClear) { setConfirmClear(true); return }
    startTransition(async () => {
      const res = await deletePendingPhoneCSVListingsAction()
      setConfirmClear(false)
      if (res.success) { toast.success(res.message ?? "Cleared"); setHasUploads(false); setLastUpload(null); router.refresh() }
      else toast.error(res.error ?? "Failed")
    })
  }

  return (
    <>
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-border">
          {([["history", History, "My Listings"], ["upload", FileUp, "Upload CSV"]] as const).map(([t, Icon, lbl]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-6 py-4 text-[13px] font-semibold border-b-2 transition-all ${
                tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              <Icon className="h-4 w-4" />
              {lbl}
              {t === "history" && listings.length > 0 && (
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${tab === t ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {listings.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "history" && (
          <>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-wrap">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <FilterDropdown label="Brand"     options={brandOptions}      value={filterBrand}     onChange={setFilterBrand} />
              <FilterDropdown label="Status"    options={STATUS_OPTIONS}     value={filterStatus}    onChange={setFilterStatus} />
              <FilterDropdown label="Condition" options={CONDITION_OPTIONS}  value={filterCondition} onChange={setFilterCondition} />
              {anyFilter && (
                <button onClick={() => { setFilterBrand(null); setFilterStatus(null); setFilterCondition(null) }}
                  className="inline-flex items-center gap-1 h-8 px-3 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
                  <RotateCcw className="h-3 w-3" /> Clear
                </button>
              )}
              <span className="ml-auto text-[12px] text-muted-foreground">{filtered.length} of {listings.length} listings</span>
            </div>
            <ListingsTable listings={filtered} />
          </>
        )}

        {tab === "upload" && (
          <div className="p-6 space-y-6">
            {lastUpload && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <p className="text-[13px] font-semibold text-emerald-800 dark:text-emerald-300">
                  {lastUpload.count} listing{lastUpload.count !== 1 ? "s" : ""} uploaded — pending admin review
                </p>
                <button onClick={() => setLastUpload(null)} className="ml-auto text-emerald-600/50 hover:text-emerald-600 transition-colors"><X className="h-4 w-4" /></button>
              </div>
            )}

            {/* CSV format */}
            <div className="rounded-xl bg-muted/40 border border-border p-4 space-y-3">
              <p className="text-[12px] font-semibold text-foreground">CSV format</p>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground mb-1">Required columns:</p>
                <code className="text-[11px] text-foreground bg-muted/60 px-2 py-1 rounded block">
                  brand_name, phone_name, ram, storage, color, price, stock
                </code>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground mb-1">Optional columns:</p>
                <code className="text-[11px] text-muted-foreground block">
                  sku, condition (SEALED/OPEN_BOX), warranty_months, warranty_type, color_hex
                </code>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground mb-1">Example row:</p>
                <code className="text-[11px] text-muted-foreground block">
                  Apple, iPhone 15 Pro, 8, 256, Black Titanium, 129900, 5
                </code>
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                ⚠ ram and storage must be integers in GB (e.g. 8, 256). Phone must exist in our catalog.
              </p>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f) }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-all ${
                dragging ? "border-primary bg-primary/5" : isWorking ? "border-border bg-muted/30 cursor-not-allowed" : "border-border hover:border-primary/40 hover:bg-muted/30"
              }`}>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = "" }}
                disabled={isWorking} />
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border border-border shadow-sm ${dragging ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                {isWorking ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <Upload className={`h-6 w-6 ${dragging ? "text-primary-foreground" : "text-muted-foreground"}`} />}
              </div>
              <div className="text-center space-y-1">
                <p className="text-[14px] font-semibold text-foreground">{isWorking ? "Uploading…" : "Drop CSV or click to browse"}</p>
                <p className="text-[12px] text-muted-foreground">Max 10 MB · Max 2000 rows</p>
              </div>
            </div>

            {hasUploads && (
              <Button variant="outline" size="sm" disabled={isWorking} onClick={handleClear} onBlur={() => setConfirmClear(false)}
                className={`text-[13px] ${confirmClear ? "border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive" : ""}`}>
                {isWorking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                {confirmClear ? "Confirm — delete all pending CSV listings?" : "Clear pending CSV listings"}
              </Button>
            )}

            {todayCSV.length > 0 && (
              <div className="border border-border rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b border-border">
                  <p className="text-[13px] font-semibold text-foreground">Today&apos;s Uploads</p>
                  <span className="text-[11px] text-muted-foreground">{todayCSV.length} listings</span>
                </div>
                <ListingsTable listings={todayCSV} />
              </div>
            )}
          </div>
        )}
      </div>
      {errorModal && <ErrorModal result={errorModal} onClose={() => setErrorModal(null)} />}
    </>
  )
}
