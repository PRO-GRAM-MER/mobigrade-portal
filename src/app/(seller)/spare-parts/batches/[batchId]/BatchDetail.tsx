"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutList,
  LayoutGrid,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Package,
} from "lucide-react";
import { submitBatchAction } from "@/actions/catalog-actions";
import type { BatchDetailData, BatchDetailDraft } from "@/actions/catalog-actions";

// ─── Status / condition maps ──────────────────────────────────────────────────

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

// ─── Row error type guard ─────────────────────────────────────────────────────

interface RowError {
  field: string;
  message: string;
}

function parseRowErrors(raw: unknown): RowError[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is RowError =>
      typeof e === "object" &&
      e !== null &&
      "field" in e &&
      "message" in e
  );
}

function isInvalid(draft: BatchDetailDraft): boolean {
  const errors = parseRowErrors(draft.rowErrors);
  return errors.length > 0;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  batch: BatchDetailData;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BatchDetail({ batch }: Props) {
  const router = useRouter();
  const [view, setView] = useState<"table" | "grid">("table");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const batchSt = BATCH_STATUS[batch.status] ?? {
    label: batch.status,
    cls: "badge--neutral",
  };

  const canSubmit =
    batch.status === "VALIDATED" &&
    batch.errorRows === 0 &&
    !submitting;

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);

    const result = await submitBatchAction(batch.id);

    setSubmitting(false);

    if (!result.success) {
      setSubmitError(result.error);
      return;
    }

    router.push("/spare-parts");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* ── Summary ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: "12px",
        }}
      >
        <StatCard label="Total Rows" value={batch.totalRows} />
        <StatCard
          label="Valid Rows"
          value={batch.validRows}
          color="var(--color-success)"
        />
        <StatCard
          label="Error Rows"
          value={batch.errorRows}
          color={batch.errorRows > 0 ? "var(--color-error)" : undefined}
        />
        <div className="stat-card" style={{ justifyContent: "center" }}>
          <p className="stat-label">Status</p>
          <span className={`badge ${batchSt.cls}`} style={{ marginTop: "4px" }}>
            {batchSt.label}
          </span>
        </div>
      </div>

      {/* ── Alerts ───────────────────────────────────────────────────────── */}
      {batch.status === "FAILED" && (
        <div className="alert alert--error">
          <AlertCircle size={16} />
          <div>
            <strong>Batch failed validation.</strong> {batch.errorRows} row
            {batch.errorRows !== 1 ? "s have" : " has"} errors — submission is
            blocked. Fix the CSV and upload again.
          </div>
        </div>
      )}

      {batch.status === "VALIDATED" && (
        <div className="alert alert--success">
          <CheckCircle2 size={16} />
          All {batch.validRows} rows passed validation. Review and submit for
          admin approval.
        </div>
      )}

      {batch.status === "SUBMITTED" && (
        <div className="alert alert--info">
          <CheckCircle2 size={16} />
          Batch submitted for review. An admin will approve the products shortly.
        </div>
      )}

      {submitError && (
        <div className="alert alert--error">
          <AlertCircle size={16} />
          {submitError}
        </div>
      )}

      {/* ── View toggle + submit ──────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        {/* Toggle */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            background: "var(--color-background)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "3px",
          }}
        >
          <ViewToggleBtn
            active={view === "table"}
            onClick={() => setView("table")}
            icon={<LayoutList size={15} />}
            label="Table"
          />
          <ViewToggleBtn
            active={view === "grid"}
            onClick={() => setView("grid")}
            icon={<LayoutGrid size={15} />}
            label="Grid"
          />
        </div>

        {/* Submit */}
        {batch.status !== "SUBMITTED" && (
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="btn btn--primary"
            title={
              !canSubmit && batch.status !== "SUBMITTED"
                ? batch.errorRows > 0
                  ? "Fix validation errors to enable submission"
                  : "Batch must be VALIDATED to submit"
                : undefined
            }
          >
            {submitting ? (
              <>
                <span className="spinner" />
                Submitting…
              </>
            ) : (
              `Submit ${batch.validRows} Product${batch.validRows !== 1 ? "s" : ""} for Review`
            )}
          </button>
        )}
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      {view === "table" ? (
        <TableView
          drafts={batch.drafts}
          expandedRow={expandedRow}
          onToggle={(id) =>
            setExpandedRow((p) => (p === id ? null : id))
          }
        />
      ) : (
        <GridView drafts={batch.drafts} />
      )}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value" style={color ? { color } : undefined}>
        {value}
      </p>
    </div>
  );
}

// ─── ViewToggleBtn ────────────────────────────────────────────────────────────

function ViewToggleBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "5px",
        padding: "5px 12px",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.8125rem",
        fontWeight: active ? 600 : 400,
        background: active ? "var(--color-surface)" : "transparent",
        color: active ? "var(--color-primary)" : "var(--color-muted-foreground)",
        border: active ? "1px solid var(--color-border)" : "none",
        transition: "all 0.1s",
        cursor: "pointer",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── TableView ────────────────────────────────────────────────────────────────

function TableView({
  drafts,
  expandedRow,
  onToggle,
}: {
  drafts: BatchDetailDraft[];
  expandedRow: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: "36px" }}>#</th>
            <th>Brand</th>
            <th>Model</th>
            <th>Part Name</th>
            <th>Part No.</th>
            <th>Condition</th>
            <th>Price</th>
            <th>Qty</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {drafts.map((draft) => {
            const errors = parseRowErrors(draft.rowErrors);
            const invalid = errors.length > 0;
            const st = DRAFT_STATUS[draft.status] ?? {
              label: draft.status,
              cls: "badge--neutral",
            };
            const condCls = CONDITION_CLS[draft.condition] ?? "badge--neutral";

            return (
              <>
                <tr
                  key={draft.id}
                  onClick={() => invalid && onToggle(draft.id)}
                  style={{
                    background: invalid ? "#fff5f5" : undefined,
                    cursor: invalid ? "pointer" : "default",
                  }}
                >
                  <td style={{ color: "var(--color-muted-foreground)", fontSize: "0.8rem" }}>
                    {draft.rowNumber ?? "—"}
                  </td>
                  <td style={{ color: "var(--color-primary)", fontWeight: 500 }}>
                    {draft.brand}
                  </td>
                  <td>{draft.modelName}</td>
                  <td style={{ color: "var(--color-primary)" }}>{draft.partName}</td>
                  <td style={{ color: "var(--color-muted-foreground)", fontSize: "0.8rem" }}>
                    {draft.partNumber ?? "—"}
                  </td>
                  <td>
                    <span className={`badge ${condCls}`}>{draft.condition}</span>
                  </td>
                  <td>₹{draft.price}</td>
                  <td>{draft.quantity}</td>
                  <td>
                    {invalid ? (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          color: "var(--color-error)",
                          fontSize: "0.8rem",
                        }}
                      >
                        {expandedRow === draft.id ? (
                          <ChevronDown size={13} />
                        ) : (
                          <ChevronRight size={13} />
                        )}
                        {errors.length} error{errors.length !== 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className={`badge ${st.cls}`}>{st.label}</span>
                    )}
                  </td>
                </tr>

                {/* Inline error expansion */}
                {invalid && expandedRow === draft.id && (
                  <tr style={{ background: "#fff0f0" }}>
                    <td
                      colSpan={9}
                      style={{ padding: "8px 12px 10px 48px" }}
                    >
                      <ul style={{ margin: 0, paddingLeft: "12px" }}>
                        {errors.map((e, i) => (
                          <li
                            key={i}
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--color-error)",
                              lineHeight: 1.7,
                            }}
                          >
                            <strong>{e.field}:</strong> {e.message}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── GridView ─────────────────────────────────────────────────────────────────

function GridView({ drafts }: { drafts: BatchDetailDraft[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: "14px",
      }}
    >
      {drafts.map((draft) => {
        const errors = parseRowErrors(draft.rowErrors);
        const invalid = errors.length > 0;
        const st = DRAFT_STATUS[draft.status] ?? {
          label: draft.status,
          cls: "badge--neutral",
        };
        const condCls = CONDITION_CLS[draft.condition] ?? "badge--neutral";

        return (
          <div
            key={draft.id}
            className="card"
            style={{
              border: invalid
                ? "1px solid #fecaca"
                : "1px solid var(--color-border)",
              background: invalid ? "#fff8f8" : undefined,
            }}
          >
            {/* Image placeholder */}
            {draft.imageUrls.length > 0 ? (
              <img
                src={draft.imageUrls[0]}
                alt={draft.partName}
                style={{
                  width: "100%",
                  height: "120px",
                  objectFit: "cover",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--color-background)",
                }}
              />
            ) : (
              <div
                style={{
                  height: "90px",
                  background: "var(--color-background)",
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-muted-foreground)",
                }}
              >
                <Package size={28} />
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <p
                style={{
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  color: "var(--color-primary)",
                  lineHeight: 1.3,
                }}
              >
                {draft.partName}
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--color-muted-foreground)" }}>
                {draft.brand} · {draft.modelName}
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <span className={`badge ${condCls}`}>{draft.condition}</span>
                {invalid ? (
                  <span className="badge badge--red">
                    {errors.length} error{errors.length !== 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className={`badge ${st.cls}`}>{st.label}</span>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "4px",
                }}
              >
                <p
                  style={{
                    fontWeight: 700,
                    color: "var(--color-primary)",
                    fontSize: "0.9375rem",
                  }}
                >
                  ₹{draft.price}
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--color-muted-foreground)" }}>
                  Qty: {draft.quantity}
                </p>
              </div>

              {invalid && errors.length > 0 && (
                <div
                  style={{
                    marginTop: "4px",
                    padding: "6px 8px",
                    background: "#fee2e2",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  {errors.slice(0, 2).map((e, i) => (
                    <p
                      key={i}
                      style={{ fontSize: "0.75rem", color: "var(--color-error)" }}
                    >
                      <strong>{e.field}:</strong> {e.message}
                    </p>
                  ))}
                  {errors.length > 2 && (
                    <p style={{ fontSize: "0.75rem", color: "var(--color-error)" }}>
                      +{errors.length - 2} more
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
