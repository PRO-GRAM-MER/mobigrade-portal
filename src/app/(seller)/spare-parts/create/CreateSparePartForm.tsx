"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { submitManualDraftAction } from "@/actions/catalog-actions";
import { PART_CONDITIONS, type ProductRowInput } from "@/lib/validations/catalog";

type FieldErrors = Partial<Record<keyof ProductRowInput, string[]>>;

const EMPTY: ProductRowInput = {
  brand: "",
  model_name: "",
  part_name: "",
  part_number: "",
  category: "",
  condition: "NEW",
  price: 0,
  quantity: 1,
  description: "",
};

const CONDITION_DESCRIPTIONS: Record<string, string> = {
  NEW:         "Brand new, original manufacturer packaging",
  OEM:         "Original part pulled from a working device",
  AFTERMARKET: "Third-party compatible replacement",
  REFURBISHED: "Used, tested, and restored to working order",
};

export default function CreateSparePartForm() {
  const router = useRouter();
  const [form, setForm] = useState<ProductRowInput>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function set<K extends keyof ProductRowInput>(
    key: K,
    value: ProductRowInput[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setLoading(true);

    const result = await submitManualDraftAction(form);
    setLoading(false);

    if (!result.success) {
      if (result.fieldErrors) setErrors(result.fieldErrors as FieldErrors);
      if (result.error) setServerError(result.error);
      return;
    }

    setSubmitted(true);
  }

  function err(field: keyof ProductRowInput) {
    return errors[field]?.[0];
  }

  // ── Success state ──────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div
        className="card"
        style={{ alignItems: "center", textAlign: "center", padding: "2.5rem 1.5rem" }}
      >
        <CheckCircle2 size={40} style={{ color: "var(--color-success)" }} />
        <div>
          <p
            style={{
              fontWeight: 700,
              fontSize: "1.0625rem",
              color: "var(--color-primary)",
            }}
          >
            Submitted for review
          </p>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--color-muted-foreground)",
              marginTop: "6px",
            }}
          >
            An admin will review your product listing shortly.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={() => router.push("/spare-parts")}
            className="btn btn--secondary btn--sm"
          >
            View listings
          </button>
          <button
            onClick={() => {
              setForm(EMPTY);
              setErrors({});
              setSubmitted(false);
            }}
            className="btn btn--ghost btn--sm"
          >
            Add another
          </button>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* ── Product details ──────────────────────────────────────────────── */}
      <div className="form-card">
        <p
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "var(--color-primary)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Product Details
        </p>

        {/* Brand + Model */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "14px",
          }}
        >
          <FormField label="Brand *" error={err("brand")}>
            <input
              className={`input-base${err("brand") ? " input-error" : ""}`}
              placeholder="Samsung"
              value={form.brand}
              onChange={(e) => set("brand", e.target.value)}
              autoFocus
            />
          </FormField>
          <FormField label="Compatible Model *" error={err("model_name")}>
            <input
              className={`input-base${err("model_name") ? " input-error" : ""}`}
              placeholder="Galaxy S23"
              value={form.model_name}
              onChange={(e) => set("model_name", e.target.value)}
            />
          </FormField>
        </div>

        {/* Part name + Part number */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "14px",
          }}
        >
          <FormField label="Part Name *" error={err("part_name")}>
            <input
              className={`input-base${err("part_name") ? " input-error" : ""}`}
              placeholder="Display Assembly"
              value={form.part_name}
              onChange={(e) => set("part_name", e.target.value)}
            />
          </FormField>
          <FormField label="Part Number / SKU" error={err("part_number")}>
            <input
              className="input-base"
              placeholder="SAM-S23-DISP (optional)"
              value={form.part_number ?? ""}
              onChange={(e) => set("part_number", e.target.value)}
            />
          </FormField>
        </div>

        {/* Category + Condition */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "14px",
          }}
        >
          <FormField label="Category" error={err("category")}>
            <input
              className="input-base"
              placeholder="e.g. Display (optional)"
              value={form.category ?? ""}
              onChange={(e) => set("category", e.target.value)}
            />
          </FormField>
          <FormField label="Condition *" error={err("condition")}>
            <select
              className={`input-base${err("condition") ? " input-error" : ""}`}
              value={form.condition}
              onChange={(e) =>
                set("condition", e.target.value as typeof form.condition)
              }
            >
              {PART_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c} — {CONDITION_DESCRIPTIONS[c]}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Price + Quantity */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "14px",
          }}
        >
          <FormField label="Price (₹) *" error={err("price")}>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "0.9375rem",
                  color: "var(--color-muted-foreground)",
                  pointerEvents: "none",
                }}
              >
                ₹
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className={`input-base${err("price") ? " input-error" : ""}`}
                style={{ paddingLeft: "28px" }}
                placeholder="0.00"
                value={form.price || ""}
                onChange={(e) =>
                  set("price", parseFloat(e.target.value) || 0)
                }
              />
            </div>
          </FormField>
          <FormField label="Quantity *" error={err("quantity")}>
            <input
              type="number"
              min="1"
              step="1"
              className={`input-base${err("quantity") ? " input-error" : ""}`}
              placeholder="1"
              value={form.quantity || ""}
              onChange={(e) =>
                set("quantity", parseInt(e.target.value, 10) || 0)
              }
            />
          </FormField>
        </div>

        {/* Description */}
        <FormField label="Description" error={err("description")}>
          <textarea
            className="input-base"
            rows={3}
            style={{ resize: "none" }}
            placeholder="Optional product description (max 1000 chars)"
            maxLength={1000}
            value={form.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
          />
        </FormField>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {serverError && (
        <div className="alert alert--error">
          <AlertCircle size={15} />
          {serverError}
        </div>
      )}

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "10px",
          paddingBottom: "1rem",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setForm(EMPTY);
            setErrors({});
            setServerError(null);
          }}
          className="btn btn--ghost"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn btn--primary"
        >
          {loading ? (
            <>
              <span className="spinner" />
              Submitting…
            </>
          ) : (
            "Submit for Review"
          )}
        </button>
      </div>
    </form>
  );
}

// ─── FormField wrapper ────────────────────────────────────────────────────────

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
