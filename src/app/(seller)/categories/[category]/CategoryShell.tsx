"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import { useRouter }   from "next/navigation";
import Link             from "next/link";
import {
  ArrowLeft, Plus, Upload, Download, X, ChevronUp, ChevronDown,
  Inbox, FileText, AlertCircle, CheckCircle2,
} from "lucide-react";
import MultiSelect       from "@/components/shared/MultiSelect";
import DatePickerFilter  from "@/components/shared/DatePickerFilter";
import type { ClientCategoryConfig } from "@/lib/categories/types";
import { getCategoryConfig } from "@/lib/categories";
import type { CategoryDraftRow, RawCsvRow } from "@/actions/category-actions";
import {
  parseCsvFile,
  generateCsvTemplate,
} from "@/lib/categories/csv-parser";
import { submitCategoryBatchAction } from "@/actions/category-actions";
import type { CsvParseResult } from "@/lib/categories/types";

// ─── Status / badge helpers ───────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; cls: string }> = {
  DRAFT:          { label: "Draft",          cls: "badge--neutral" },
  PENDING_REVIEW: { label: "Pending Review", cls: "badge--yellow"  },
  APPROVED:       { label: "Approved",       cls: "badge--green"   },
  REJECTED:       { label: "Rejected",       cls: "badge--red"     },
  NEEDS_CHANGES:  { label: "Needs Changes",  cls: "badge--orange"  },
};

const CONDITION_CLS: Record<string, string> = {
  NEW:         "badge--blue",
  OEM:         "badge--neutral",
  AFTERMARKET: "badge--orange",
  REFURBISHED: "badge--green",
};

const GRADE_CLS: Record<string, string> = {
  GRADE_A: "badge--green",
  GRADE_B: "badge--yellow",
  GRADE_C: "badge--orange",
  A:       "badge--green",
  B:       "badge--yellow",
  C:       "badge--orange",
  D:       "badge--red",
  SEALED:         "badge--green",
  OPENED_INTACT:  "badge--blue",
  BOX_DAMAGED:    "badge--orange",
};

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(iso));
}
function fmtPrice(p: string) {
  return "₹" + Number(p).toLocaleString("en-IN");
}

// ─── Column definitions per category ─────────────────────────────────────────

type ColType = "text" | "price" | "badge-status" | "badge-condition"
             | "badge-grade" | "date" | "muted" | "bold";

interface ColDef {
  key:      string;
  label:    string;
  type:     ColType;
  sortable?: boolean;
  getValue: (d: CategoryDraftRow) => string | number | null | undefined;
  // admin extra prefix column handled separately
}

function getCols(slug: string, isAdmin: boolean): ColDef[] {
  const adminCols: ColDef[] = isAdmin
    ? [{ key: "seller", label: "Seller", type: "muted", getValue: (d) => d.sellerName ?? "—" }]
    : [];
  const tail: ColDef[] = [
    { key: "status",  label: "Status",  type: "badge-status", getValue: (d) => d.status },
    { key: "date",    label: "Date",    type: "date", sortable: true, getValue: (d) => d.createdAt },
  ];
  if (isAdmin) {
    tail.push({ key: "_review", label: "", type: "text", getValue: (d) => d.id });
  }

  const base: ColDef[] = [
    { key: "brand", label: "Brand", type: "bold",  sortable: true, getValue: (d) => d.brand },
    { key: "model", label: "Model", type: "muted", sortable: true, getValue: (d) => d.modelName },
  ];

  const priceQty: ColDef[] = [
    { key: "price", label: "Price", type: "price", sortable: true, getValue: (d) => d.price },
    { key: "qty",   label: "Qty",   type: "muted",                 getValue: (d) => d.quantity },
  ];

  switch (slug) {
    case "spare-parts":
      return [
        ...adminCols, ...base,
        { key: "partName",  label: "Part",      type: "bold", sortable: true, getValue: (d) => d.partName },
        { key: "condition", label: "Condition", type: "badge-condition",      getValue: (d) => d.condition },
        ...priceQty, ...tail,
      ];

    case "vrp":
      return [
        ...adminCols, ...base,
        { key: "variant", label: "Variant", type: "muted", getValue: (d) => [d.specs?.storage, d.specs?.ram].filter(Boolean).join(" / ") as string },
        { key: "color",   label: "Color",   type: "muted", getValue: (d) => d.specs?.color as string },
        { key: "grade",   label: "Grade",   type: "badge-grade", getValue: (d) => d.specs?.grade as string },
        ...priceQty, ...tail,
      ];

    case "new-phones":
      return [
        ...adminCols, ...base,
        { key: "variant",  label: "Variant",     type: "muted", getValue: (d) => [d.specs?.storage, d.specs?.ram].filter(Boolean).join(" / ") as string },
        { key: "color",    label: "Color",        type: "muted", getValue: (d) => d.specs?.color as string },
        { key: "warranty", label: "Warranty",     type: "muted", getValue: (d) => d.specs?.warranty_months != null ? `${d.specs.warranty_months}m` : "—" },
        ...priceQty, ...tail,
      ];

    case "prexo":
      return [
        ...adminCols, ...base,
        { key: "variant",    label: "Variant",       type: "muted", getValue: (d) => [d.specs?.storage, d.specs?.ram].filter(Boolean).join(" / ") as string },
        { key: "grade",      label: "Grade",          type: "badge-grade", getValue: (d) => d.specs?.grade as string },
        { key: "exPrice",    label: "Exchange Price", type: "price", sortable: true, getValue: (d) => d.specs?.exchange_price != null ? String(d.specs.exchange_price) : "0" },
        { key: "sellerPrice",label: "Seller Price",   type: "price", sortable: true, getValue: (d) => d.price },
        { key: "qty",        label: "Qty",            type: "muted", getValue: (d) => d.quantity },
        ...tail,
      ];

    case "open-box":
      return [
        ...adminCols, ...base,
        { key: "variant",    label: "Variant",       type: "muted", getValue: (d) => [d.specs?.storage, d.specs?.ram].filter(Boolean).join(" / ") as string },
        { key: "color",      label: "Color",         type: "muted", getValue: (d) => d.specs?.color as string },
        { key: "boxCond",    label: "Box Condition", type: "badge-grade", getValue: (d) => d.specs?.box_condition as string },
        ...priceQty, ...tail,
      ];

    default:
      return [...adminCols, ...base, ...priceQty, ...tail];
  }
}

function renderCell(col: ColDef, draft: CategoryDraftRow, isAdmin: boolean) {
  const val = col.getValue(draft);

  // Admin review link
  if (col.key === "_review") {
    return (
      <td key="_review">
        <Link href={`/admin/product-review/${draft.id}`} className="btn btn--ghost btn--sm">
          Review
        </Link>
      </td>
    );
  }

  if (col.type === "price")          return <td key={col.key}>{val != null ? fmtPrice(String(val)) : "—"}</td>;
  if (col.type === "date")           return <td key={col.key} className="td--muted" style={{ whiteSpace: "nowrap" }}>{val ? fmtDate(String(val)) : "—"}</td>;
  if (col.type === "muted")          return <td key={col.key} className="td--muted">{val ?? "—"}</td>;
  if (col.type === "bold")           return <td key={col.key} style={{ fontWeight: 600, color: "var(--color-primary)" }}>{val ?? "—"}</td>;
  if (col.type === "badge-status") {
    const m = STATUS_META[String(val)] ?? { label: String(val), cls: "badge--neutral" };
    return <td key={col.key}><span className={`badge ${m.cls}`}>{m.label}</span></td>;
  }
  if (col.type === "badge-condition") {
    const cls = CONDITION_CLS[String(val)] ?? "badge--neutral";
    return <td key={col.key}>{val ? <span className={`badge ${cls}`}>{val}</span> : <span className="td--muted">—</span>}</td>;
  }
  if (col.type === "badge-grade") {
    const cls = GRADE_CLS[String(val)] ?? "badge--neutral";
    return <td key={col.key}>{val ? <span className={`badge ${cls}`}>{String(val).replace(/_/g, " ")}</span> : <span className="td--muted">—</span>}</td>;
  }
  return <td key={col.key}>{val ?? "—"}</td>;
}

// ─── Category-specific filter options ────────────────────────────────────────

interface SpecFilter { key: string; label: string; options: string[] }

function getSpecFilters(config: ClientCategoryConfig): SpecFilter[] {
  return config.fields
    .filter(
      (f) =>
        f.type === "select" &&
        f.options &&
        !["brand", "model_name"].includes(f.key)
    )
    .map((f) => ({ key: f.key, label: f.label, options: f.options! }));
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  config:          ClientCategoryConfig;
  drafts:          CategoryDraftRow[];
  uploadDates:     string[];
  isAdmin?:        boolean;
  backHref:        string;
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export default function CategoryShell({
  config,
  drafts,
  uploadDates,
  isAdmin = false,
  backHref,
}: Props) {
  const router = useRouter();

  // ── Filter state ──────────────────────────────────────────────────────────
  const [filterBrands,   setFilterBrands]   = useState<string[]>([]);
  const [filterModels,   setFilterModels]   = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterSpecific, setFilterSpecific] = useState<Record<string, string[]>>({});
  const [priceMin,       setPriceMin]       = useState("");
  const [priceMax,       setPriceMax]       = useState("");
  const [filterDate,     setFilterDate]     = useState<string | null>(null);
  const [sortKey,        setSortKey]        = useState("date");
  const [sortDir,        setSortDir]        = useState<"asc" | "desc">("desc");
  const [showCsvModal,   setShowCsvModal]   = useState(false);

  // ── Derived filter options ────────────────────────────────────────────────
  const allBrands = useMemo(
    () => [...new Set(drafts.map((d) => d.brand))].sort(),
    [drafts]
  );
  const allModels = useMemo(() => {
    const src = filterBrands.length > 0 ? drafts.filter((d) => filterBrands.includes(d.brand)) : drafts;
    return [...new Set(src.map((d) => d.modelName))].sort();
  }, [drafts, filterBrands]);

  const specFilters = useMemo(() => getSpecFilters(config), [config]);
  const cols        = useMemo(() => getCols(config.slug, isAdmin), [config.slug, isAdmin]);

  // ── Filtered + sorted data ────────────────────────────────────────────────
  const displayDrafts = useMemo(() => {
    let res = [...drafts];

    if (filterBrands.length)   res = res.filter((d) => filterBrands.includes(d.brand));
    if (filterModels.length)   res = res.filter((d) => filterModels.includes(d.modelName));
    if (filterStatuses.length) res = res.filter((d) => filterStatuses.includes(d.status));

    for (const [k, vals] of Object.entries(filterSpecific)) {
      if (!vals.length) continue;
      res = res.filter((d) => {
        const raw =
          k === "condition" ? d.condition : (d.specs?.[k] as string | undefined);
        return raw != null && vals.includes(raw);
      });
    }

    if (priceMin) res = res.filter((d) => Number(d.price) >= Number(priceMin));
    if (priceMax) res = res.filter((d) => Number(d.price) <= Number(priceMax));
    if (filterDate)
      res = res.filter((d) => d.createdAt.slice(0, 10) === filterDate);

    res.sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      switch (sortKey) {
        case "price": av = Number(a.price); bv = Number(b.price); break;
        case "exPrice":
          av = Number(a.specs?.exchange_price ?? 0);
          bv = Number(b.specs?.exchange_price ?? 0); break;
        case "qty":   av = a.quantity; bv = b.quantity; break;
        case "brand": av = a.brand;    bv = b.brand;    break;
        case "model": av = a.modelName;bv = b.modelName;break;
        case "partName": av = a.partName ?? ""; bv = b.partName ?? ""; break;
        case "sellerPrice": av = Number(a.price); bv = Number(b.price); break;
        default:      av = a.createdAt; bv = b.createdAt;
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return res;
  }, [drafts, filterBrands, filterModels, filterStatuses, filterSpecific, priceMin, priceMax, filterDate, sortKey, sortDir]);

  const activeFilters = [
    filterBrands.length, filterModels.length, filterStatuses.length,
    ...Object.values(filterSpecific).map((v) => v.length),
    priceMin ? 1 : 0, priceMax ? 1 : 0, filterDate ? 1 : 0,
  ].reduce((a, b) => a + (b > 0 ? 1 : 0), 0);

  function clearAll() {
    setFilterBrands([]); setFilterModels([]); setFilterStatuses([]);
    setFilterSpecific({}); setPriceMin(""); setPriceMax(""); setFilterDate(null);
  }

  // ── Active filter chips (dismissible) ──────────────────────────────────
  const activeChips = useMemo(() => {
    const chips: { id: string; label: string; onRemove: () => void }[] = [];
    filterBrands.forEach((b) =>
      chips.push({ id: `brand:${b}`, label: b, onRemove: () => setFilterBrands((v) => v.filter((x) => x !== b)) })
    );
    filterModels.forEach((m) =>
      chips.push({ id: `model:${m}`, label: m, onRemove: () => setFilterModels((v) => v.filter((x) => x !== m)) })
    );
    filterStatuses.forEach((s) =>
      chips.push({ id: `status:${s}`, label: STATUS_META[s]?.label ?? s, onRemove: () => setFilterStatuses((v) => v.filter((x) => x !== s)) })
    );
    Object.entries(filterSpecific).forEach(([k, vals]) => {
      const sf = specFilters.find((f) => f.key === k);
      vals.forEach((v) =>
        chips.push({ id: `spec:${k}:${v}`, label: `${sf?.label ?? k}: ${v}`, onRemove: () => setFilterSpecific((prev) => ({ ...prev, [k]: (prev[k] ?? []).filter((x) => x !== v) })) })
      );
    });
    if (priceMin) chips.push({ id: "pmin", label: `Min ₹${Number(priceMin).toLocaleString("en-IN")}`, onRemove: () => setPriceMin("") });
    if (priceMax) chips.push({ id: "pmax", label: `Max ₹${Number(priceMax).toLocaleString("en-IN")}`, onRemove: () => setPriceMax("") });
    if (filterDate) chips.push({ id: "date", label: fmtDate(filterDate), onRemove: () => setFilterDate(null) });
    return chips;
  }, [filterBrands, filterModels, filterStatuses, filterSpecific, priceMin, priceMax, filterDate, specFilters]);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function downloadSample() {
    const csv  = generateCsvTemplate(config);
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `mobigrade_${config.slug}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const SortIcon = ({ k }: { k: string }) =>
    sortKey === k
      ? sortDir === "asc"
        ? <ChevronUp size={12} style={{ display: "inline-block", marginLeft: 3 }} />
        : <ChevronDown size={12} style={{ display: "inline-block", marginLeft: 3 }} />
      : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="cat-header">
        <div className="cat-header-left">
          <Link href={backHref} className="cat-back-btn" aria-label="Back">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="cat-title">{config.label}</h1>
            <p className="cat-subtitle">{config.description}</p>
          </div>
        </div>

        <div className="cat-header-actions">
          <button onClick={downloadSample} className="btn btn--ghost btn--sm">
            <Download size={14} />
            Download Sample
          </button>
          <button onClick={() => setShowCsvModal(true)} className="btn btn--ghost btn--sm">
            <Upload size={14} />
            Upload CSV
          </button>
          {!isAdmin && (
            <Link href={`/categories/${config.slug}/new`} className="btn btn--primary btn--sm">
              <Plus size={14} />
              Create Manually
            </Link>
          )}
        </div>
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────────── */}
      <div className="filter-bar">
        <div className="filter-bar-inner">

          {/* Category-specific spec filters */}
          {specFilters.length > 0 && (
            <div className="filter-group">
              {specFilters.map((sf) => (
                <MultiSelect
                  key={sf.key}
                  label={sf.label}
                  options={sf.options}
                  value={filterSpecific[sf.key] ?? []}
                  onChange={(v) => setFilterSpecific((prev) => ({ ...prev, [sf.key]: v }))}
                />
              ))}
            </div>
          )}

          {/* Core filters */}
          <div className="filter-group">
            <MultiSelect
              label="Brand"
              options={allBrands}
              value={filterBrands}
              onChange={(v) => { setFilterBrands(v); setFilterModels([]); }}
              searchable
            />
            <MultiSelect
              label="Model"
              options={allModels}
              value={filterModels}
              onChange={setFilterModels}
              searchable
            />
            <MultiSelect
              label="Status"
              options={Object.entries(STATUS_META).map(([v, m]) => ({ value: v, label: m.label }))}
              value={filterStatuses}
              onChange={setFilterStatuses}
            />
          </div>

          {/* Price + Date */}
          <div className="filter-group">
            <div className="filter-price-group">
              <span className="ms-label">Price (₹)</span>
              <div className="filter-price-inputs">
                <input
                  type="number"
                  className="filter-price-input"
                  placeholder="Min"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  min="0"
                />
                <span className="filter-price-sep">–</span>
                <input
                  type="number"
                  className="filter-price-input"
                  placeholder="Max"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  min="0"
                />
              </div>
            </div>

            <DatePickerFilter
              value={filterDate}
              onChange={setFilterDate}
              highlightedDates={uploadDates}
            />
          </div>

          {/* Clear all — inline */}
          {activeFilters > 0 && (
            <button type="button" className="filter-clear-inline" onClick={clearAll}>
              Clear <X size={10} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Active chips */}
        {activeChips.length > 0 && (
          <div className="fchip-row">
            {activeChips.map((chip) => (
              <span key={chip.id} className="fchip">
                {chip.label}
                <button type="button" className="fchip-x" onClick={chip.onRemove} aria-label={`Remove ${chip.label}`}>
                  <X size={9} strokeWidth={3} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Results row ──────────────────────────────────────────────────── */}
      <div className="results-row">
        <p className="results-count">
          {displayDrafts.length} result{displayDrafts.length !== 1 ? "s" : ""}
          {activeFilters > 0 && <span className="results-filtered"> (filtered from {drafts.length})</span>}
        </p>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      {displayDrafts.length === 0 ? (
        <div className="empty-state">
          <Inbox size={36} style={{ color: "var(--color-muted-foreground)" }} />
          <div>
            <p style={{ fontWeight: 600, color: "var(--color-primary)" }}>No listings found</p>
            <p style={{ fontSize: "0.85rem", marginTop: 4 }}>
              {activeFilters > 0
                ? "Try clearing some filters."
                : `Upload a CSV or create ${config.label} listings manually.`}
            </p>
          </div>
          {!isAdmin && activeFilters === 0 && (
            <div className="empty-state-actions">
              <button onClick={() => setShowCsvModal(true)} className="btn btn--ghost btn--sm">
                <Upload size={13} /> Upload CSV
              </button>
              <Link href={`/categories/${config.slug}/new`} className="btn btn--primary btn--sm">
                <Plus size={13} /> Create Manually
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                {cols.map((col) =>
                  col.key === "_review" ? (
                    <th key="_review" />
                  ) : (
                    <th
                      key={col.key}
                      onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                      style={col.sortable ? { cursor: "pointer", userSelect: "none" } : undefined}
                    >
                      {col.label}
                      <SortIcon k={col.key} />
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {displayDrafts.map((draft) => (
                <React.Fragment key={draft.id}>
                  <tr>
                    {cols.map((col) => renderCell(col, draft, isAdmin))}
                  </tr>
                  {(draft.status === "REJECTED" || draft.status === "NEEDS_CHANGES") && draft.rejectionReason && (
                    <tr style={{ background: draft.status === "REJECTED" ? "var(--color-error-bg, #FEF2F2)" : "var(--color-warn-bg, #FFFBEB)" }}>
                      <td
                        colSpan={cols.length}
                        style={{
                          padding: "6px 12px 8px",
                          fontSize: "0.78rem",
                          color: draft.status === "REJECTED" ? "#B91C1C" : "#92400E",
                          borderTop: "none",
                        }}
                      >
                        <strong>{draft.status === "REJECTED" ? "Rejected" : "Changes needed"}:</strong>{" "}
                        {draft.rejectionReason}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── CSV upload modal ─────────────────────────────────────────────── */}
      {showCsvModal && (
        <CsvUploadModal
          config={config}
          onClose={() => setShowCsvModal(false)}
          onSuccess={() => {
            setShowCsvModal(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

// ─── CSV Upload Modal ─────────────────────────────────────────────────────────

type UploadStep = "idle" | "parsing" | "preview" | "submitting" | "done";

function CsvUploadModal({
  config,
  onClose,
  onSuccess,
}: {
  config:    ClientCategoryConfig;
  onClose:   () => void;
  onSuccess: () => void;
}) {
  // Full config with validators — needed for client-side CSV validation
  const fullConfig = getCategoryConfig(config.slug)!;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step,        setStep]        = useState<UploadStep>("idle");
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [filename,    setFilename]    = useState("");
  const [parseError,  setParseError]  = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [progress,    setProgress]    = useState(0);
  const [batchResult, setBatchResult] = useState<{ validRows: number; errorRows: number } | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".csv")) {
        setParseError("Only .csv files are accepted.");
        return;
      }
      setParseError(null);
      setServerError(null);
      setFilename(file.name);
      setStep("parsing");
      setProgress(0);

      const result = await parseCsvFile(file, fullConfig, (p) => {
        setProgress(p.total > 0 ? Math.round((p.parsed / p.total) * 100) : 0);
      });

      if (result.headerErrors.length > 0) {
        setParseError(result.headerErrors.join(" · "));
        setStep("idle");
        return;
      }
      setParseResult(result);
      setStep("preview");
    },
    [config]
  );

  async function handleSubmit() {
    if (!parseResult) return;
    setStep("submitting");
    setServerError(null);

    const rawRows: RawCsvRow[] = parseResult.validRows.map((r) => ({
      rowNumber: r.rowNumber,
      fields:    r.raw,
    }));

    const res = await submitCategoryBatchAction(config.slug, filename, rawRows);
    if (!res.success) {
      setServerError(res.error);
      setStep("preview");
      return;
    }
    setBatchResult({ validRows: res.data.validRows, errorRows: res.data.errorRows });
    setStep("done");
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-box">
        {/* Modal header */}
        <div className="modal-header">
          <div>
            <p className="modal-title">Upload {config.label} CSV</p>
            <p className="modal-subtitle">
              Required: {config.requiredCsvHeaders.join(", ")}
            </p>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* ── idle ── */}
        {step === "idle" && (
          <div
            className="upload-zone"
            style={{ padding: "2.5rem 1.5rem" }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <Upload size={28} style={{ color: "var(--color-muted-foreground)" }} />
              <div style={{ textAlign: "center" }}>
                <p style={{ fontWeight: 600, color: "var(--color-primary)" }}>
                  Drop your CSV here or click to choose
                </p>
                <p style={{ fontSize: "0.8125rem", color: "var(--color-muted-foreground)", marginTop: 4 }}>
                  Max 2 000 rows · UTF-8 · .csv only
                </p>
              </div>
              {parseError && (
                <div className="alert alert--error" style={{ width: "100%" }}>
                  <AlertCircle size={14} /> {parseError}
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        )}

        {/* ── parsing ── */}
        {step === "parsing" && (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <div className="spinner" style={{ margin: "0 auto 12px" }} />
            <p style={{ color: "var(--color-primary)", fontWeight: 500 }}>
              Parsing {filename}…
            </p>
            <div className="progress-bar-wrap">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-muted-foreground)", marginTop: 8 }}>
              {progress}% validated
            </p>
          </div>
        )}

        {/* ── preview ── */}
        {step === "preview" && parseResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Summary */}
            <div className="csv-summary">
              <div className="csv-stat csv-stat--ok">
                <span className="csv-stat-val">{parseResult.validRows.length}</span>
                <span className="csv-stat-label">Valid rows</span>
              </div>
              <div className="csv-stat csv-stat--err">
                <span className="csv-stat-val">{parseResult.invalidRows.length}</span>
                <span className="csv-stat-label">Error rows</span>
              </div>
              <div className="csv-stat">
                <span className="csv-stat-val">{parseResult.totalRows}</span>
                <span className="csv-stat-label">Total rows</span>
              </div>
            </div>

            {/* Warnings */}
            {parseResult.headerWarnings.length > 0 && (
              <div className="alert alert--warning">
                <AlertCircle size={14} />
                <span>Unknown columns ignored: {parseResult.headerWarnings.map((w) => w.replace("Unknown column ", "").replace(" will be ignored", "")).join(", ")}</span>
              </div>
            )}

            {/* Error preview */}
            {parseResult.invalidRows.length > 0 && (
              <details>
                <summary style={{ cursor: "pointer", fontSize: "0.8125rem", color: "var(--color-error)", fontWeight: 500, userSelect: "none" }}>
                  {parseResult.invalidRows.length} row{parseResult.invalidRows.length !== 1 ? "s" : ""} with errors (click to expand)
                </summary>
                <div className="table-wrapper" style={{ marginTop: 8, maxHeight: 200, overflowY: "auto" }}>
                  <table className="table">
                    <thead>
                      <tr><th>Row</th><th>Field</th><th>Error</th></tr>
                    </thead>
                    <tbody>
                      {parseResult.invalidRows.slice(0, 30).flatMap((row) =>
                        row.errors.map((err, i) => (
                          <tr key={`${row.rowNumber}-${i}`}>
                            {i === 0 && <td rowSpan={row.errors.length} className="td--muted">{row.rowNumber}</td>}
                            <td style={{ color: "var(--color-primary)", fontWeight: 500 }}>{err.field}</td>
                            <td style={{ color: "var(--color-error)" }}>{err.message}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </details>
            )}

            {serverError && (
              <div className="alert alert--error"><AlertCircle size={14} /> {serverError}</div>
            )}

            {parseResult.validRows.length === 0 ? (
              <div className="alert alert--error">
                <AlertCircle size={14} /> No valid rows to submit. Fix errors and re-upload.
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button onClick={onClose} className="btn btn--ghost">Cancel</button>
                <button onClick={handleSubmit} className="btn btn--primary">
                  Submit {parseResult.validRows.length} valid row{parseResult.validRows.length !== 1 ? "s" : ""} for review
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── submitting ── */}
        {step === "submitting" && (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <div className="spinner" style={{ margin: "0 auto 12px" }} />
            <p style={{ color: "var(--color-primary)", fontWeight: 500 }}>Submitting…</p>
          </div>
        )}

        {/* ── done ── */}
        {step === "done" && batchResult && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "1.5rem 0" }}>
            <CheckCircle2 size={40} style={{ color: "var(--color-success)" }} />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-primary)" }}>
                Batch submitted
              </p>
              <p style={{ fontSize: "0.875rem", color: "var(--color-muted-foreground)", marginTop: 4 }}>
                {batchResult.validRows} row{batchResult.validRows !== 1 ? "s" : ""} sent for admin review
                {batchResult.errorRows > 0 && ` · ${batchResult.errorRows} invalid rows skipped`}
              </p>
            </div>
            <button onClick={onSuccess} className="btn btn--primary">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
