"use client";

import { useState } from "react";
import Link from "next/link";
import { Upload, Plus, Download, X, FileText, AlertCircle } from "lucide-react";
import SparePartsUploader from "./SparePartsUploader";
import {
  CSV_TEMPLATE_ROWS,
  REQUIRED_CSV_HEADERS,
} from "@/lib/validations/catalog";
import type { BatchListItem, ClientDraftListItem } from "@/actions/catalog-actions";

// ─── Status maps ──────────────────────────────────────────────────────────────

const BATCH_STATUS: Record<string, { label: string; cls: string }> = {
  PROCESSING:      { label: "Processing",   cls: "badge--yellow"  },
  VALIDATED:       { label: "Validated",    cls: "badge--green"   },
  PARTIALLY_VALID: { label: "Partial",      cls: "badge--orange"  },
  FAILED:          { label: "Failed",       cls: "badge--red"     },
  SUBMITTED:       { label: "Submitted",    cls: "badge--blue"    },
};

const DRAFT_STATUS: Record<string, { label: string; cls: string }> = {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE_ROWS], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mobigrade_spare_parts_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  batches: BatchListItem[];
  manualDrafts: ClientDraftListItem[];
  manualTotal: number;
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export default function SparePartsClientShell({
  batches,
  manualDrafts,
  manualTotal,
}: Props) {
  const [tab, setTab] = useState<"uploads" | "manual">("uploads");
  const [showUploader, setShowUploader] = useState(false);

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Spare Parts</h1>
          <p className="page-subtitle">
            {batches.length} batch{batches.length !== 1 ? "es" : ""} · {manualTotal} manual entr{manualTotal !== 1 ? "ies" : "y"}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={downloadTemplate}
            className="btn btn--ghost btn--sm"
            title={`Required columns: ${REQUIRED_CSV_HEADERS.join(", ")}`}
          >
            <Download size={14} />
            Sample CSV
          </button>

          <button
            onClick={() => setShowUploader(true)}
            className="btn btn--ghost btn--sm"
          >
            <Upload size={14} />
            Upload CSV
          </button>

          <Link href="/spare-parts/create" className="btn btn--primary btn--sm">
            <Plus size={14} />
            Create Spare Part
          </Link>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="tabs">
        <button
          onClick={() => setTab("uploads")}
          className={`tab ${tab === "uploads" ? "tab--active" : ""}`}
        >
          Uploads
          {batches.length > 0 && (
            <span
              className="badge badge--neutral ml-2"
              style={{ fontSize: "0.7rem", padding: "1px 7px" }}
            >
              {batches.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("manual")}
          className={`tab ${tab === "manual" ? "tab--active" : ""}`}
        >
          Manual Entries
          {manualTotal > 0 && (
            <span
              className="badge badge--neutral ml-2"
              style={{ fontSize: "0.7rem", padding: "1px 7px" }}
            >
              {manualTotal}
            </span>
          )}
        </button>
      </div>

      {/* ── Tab content ────────────────────────────────────────────────────── */}
      {tab === "uploads" && (
        <UploadsTab batches={batches} onUpload={() => setShowUploader(true)} />
      )}
      {tab === "manual" && (
        <ManualEntriesTab drafts={manualDrafts} total={manualTotal} />
      )}

      {/* ── Upload modal overlay ────────────────────────────────────────────── */}
      {showUploader && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto"
          style={{ paddingTop: "4rem", paddingBottom: "2rem" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowUploader(false);
          }}
        >
          <div
            className="w-full bg-white shadow-2xl"
            style={{
              maxWidth: "720px",
              borderRadius: "var(--radius-lg)",
              padding: "1.5rem",
              margin: "0 1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1.25rem",
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "var(--color-primary)",
                  }}
                >
                  Upload CSV
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--color-muted-foreground)" }}>
                  All rows must be valid before submission is allowed.
                </p>
              </div>
              <button
                onClick={() => setShowUploader(false)}
                className="btn btn--ghost btn--sm"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <SparePartsUploader onClose={() => setShowUploader(false)} />
          </div>
        </div>
      )}
    </>
  );
}

// ─── UploadsTab ───────────────────────────────────────────────────────────────

function UploadsTab({
  batches,
  onUpload,
}: {
  batches: BatchListItem[];
  onUpload: () => void;
}) {
  if (batches.length === 0) {
    return (
      <div className="empty-state">
        <FileText size={32} style={{ color: "var(--color-muted-foreground)" }} />
        <div>
          <p style={{ fontWeight: 600, color: "var(--color-primary)" }}>
            No uploads yet
          </p>
          <p style={{ fontSize: "0.85rem", marginTop: "4px" }}>
            Upload a CSV file to list spare parts in bulk.
          </p>
        </div>
        <button onClick={onUpload} className="btn btn--primary btn--sm">
          <Upload size={14} />
          Upload CSV
        </button>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th>File</th>
            <th>Rows</th>
            <th>Valid</th>
            <th>Errors</th>
            <th>Status</th>
            <th>Uploaded</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {batches.map((b) => {
            const st = BATCH_STATUS[b.status] ?? { label: b.status, cls: "badge--neutral" };
            return (
              <tr key={b.id}>
                <td style={{ color: "var(--color-primary)", fontWeight: 500, maxWidth: "220px" }}>
                  <span
                    style={{
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={b.filename}
                  >
                    {b.filename}
                  </span>
                </td>
                <td>{b.totalRows}</td>
                <td style={{ color: "var(--color-success)" }}>{b.validRows}</td>
                <td>
                  {b.errorRows > 0 ? (
                    <span style={{ color: "var(--color-error)" }}>{b.errorRows}</span>
                  ) : (
                    <span style={{ color: "var(--color-muted-foreground)" }}>—</span>
                  )}
                </td>
                <td>
                  <span className={`badge ${st.cls}`}>{st.label}</span>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>{formatDate(b.createdAt)}</td>
                <td>
                  <Link
                    href={`/spare-parts/batches/${b.id}`}
                    className="btn btn--ghost btn--sm"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    View Details
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── ManualEntriesTab ─────────────────────────────────────────────────────────

function ManualEntriesTab({
  drafts,
  total,
}: {
  drafts: ClientDraftListItem[];
  total: number;
}) {
  if (drafts.length === 0) {
    return (
      <div className="empty-state">
        <Plus size={32} style={{ color: "var(--color-muted-foreground)" }} />
        <div>
          <p style={{ fontWeight: 600, color: "var(--color-primary)" }}>
            No manual entries yet
          </p>
          <p style={{ fontSize: "0.85rem", marginTop: "4px" }}>
            Create a spare part listing manually.
          </p>
        </div>
        <Link href="/spare-parts/create" className="btn btn--primary btn--sm">
          <Plus size={14} />
          Create Spare Part
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Brand</th>
              <th>Model</th>
              <th>Part</th>
              <th>Condition</th>
              <th>Price</th>
              <th>Qty</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {drafts.map((d) => {
              const st = DRAFT_STATUS[d.status] ?? { label: d.status, cls: "badge--neutral" };
              const condCls = (d.condition ? CONDITION_CLS[d.condition] : undefined) ?? "badge--neutral";
              return (
                <tr key={d.id}>
                  <td style={{ color: "var(--color-primary)", fontWeight: 500 }}>{d.brand}</td>
                  <td>{d.modelName}</td>
                  <td style={{ color: "var(--color-primary)" }}>{d.partName}</td>
                  <td>
                    <span className={`badge ${condCls}`}>{d.condition}</span>
                  </td>
                  <td>₹{d.price}</td>
                  <td>{d.quantity}</td>
                  <td>
                    <span className={`badge ${st.cls}`}>{st.label}</span>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDate(d.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {total > drafts.length && (
        <p className="pagination-info">
          Showing {drafts.length} of {total} entries
        </p>
      )}
    </div>
  );
}
