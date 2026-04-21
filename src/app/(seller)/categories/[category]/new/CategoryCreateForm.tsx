"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter }    from "next/navigation";
import Link             from "next/link";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { validateSpecsRow } from "@/lib/categories/schema-builder";
import { createCategoryDraftAction } from "@/actions/category-actions";
import { getCategoryConfig } from "@/lib/categories";
import type { ClientCategoryConfig, ClientFieldDef } from "@/lib/categories/types";
import type { BrandWithModels } from "@/actions/category-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldErrors = Record<string, string>;

// ─── Field renderer ───────────────────────────────────────────────────────────

function FieldInput({
  field,
  value,
  onChange,
  error,
  brands,
  selectedBrand,
  onBrandChange,
  modelOptions,
}: {
  field:          ClientFieldDef;
  value:          unknown;
  onChange:       (v: unknown) => void;
  error?:         string;
  brands?:        BrandWithModels[];
  selectedBrand?: string;
  onBrandChange?: (brand: string) => void;
  modelOptions?:  string[];
}) {
  const str   = value == null ? "" : String(value);
  const errCls = error ? " input-error" : "";

  // Brand special: cascading dropdown from master data
  if (field.key === "brand" && brands && brands.length > 0) {
    return (
      <select
        id={field.key}
        className={`input-base${errCls}`}
        value={str}
        onChange={(e) => {
          onChange(e.target.value);
          onBrandChange?.(e.target.value);
        }}
      >
        <option value="">Select brand</option>
        {brands.map((b) => (
          <option key={b.id} value={b.name}>{b.name}</option>
        ))}
      </select>
    );
  }

  // Model special: cascading from brand
  if (field.key === "model_name" && modelOptions && modelOptions.length > 0) {
    return (
      <select
        id={field.key}
        className={`input-base${errCls}`}
        value={str}
        onChange={(e) => onChange(e.target.value)}
        disabled={!selectedBrand}
      >
        <option value="">{selectedBrand ? "Select model" : "Select brand first"}</option>
        {modelOptions.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    );
  }

  if (field.type === "select") {
    return (
      <select
        id={field.key}
        className={`input-base${errCls}`}
        value={str}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select {field.label}</option>
        {field.options?.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (field.type === "multiselect") {
    const arr = Array.isArray(value) ? value as string[] : [];
    return (
      <div className="multiselect-chips-wrap">
        {field.options?.map((opt) => {
          const checked = arr.includes(opt);
          return (
            <label key={opt} className={`chip-toggle${checked ? " chip-toggle--on" : ""}`}>
              <input
                type="checkbox"
                className="sr-only"
                checked={checked}
                onChange={() =>
                  onChange(checked ? arr.filter((v) => v !== opt) : [...arr, opt])
                }
              />
              {opt}
            </label>
          );
        })}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        id={field.key}
        className={`input-base${errCls}`}
        rows={3}
        style={{ resize: "none" }}
        placeholder={`Enter ${field.label.toLowerCase()}`}
        maxLength={1000}
        value={str}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (field.type === "number") {
    return (
      <div style={{ position: "relative" }}>
        {field.unit && (
          <span style={{
            position: "absolute", left: 14, top: "50%",
            transform: "translateY(-50%)", color: "var(--color-muted-foreground)",
            pointerEvents: "none", fontSize: "0.875rem",
          }}>
            {field.unit}
          </span>
        )}
        <input
          id={field.key}
          type="number"
          min="0"
          step={field.unit === "₹" ? "0.01" : "1"}
          className={`input-base${errCls}`}
          style={field.unit ? { paddingLeft: "2rem" } : undefined}
          placeholder="0"
          value={str}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        />
      </div>
    );
  }

  return (
    <input
      id={field.key}
      type="text"
      className={`input-base${errCls}`}
      placeholder={`Enter ${field.label.toLowerCase()}`}
      value={str}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

interface Props {
  config:         ClientCategoryConfig;
  brandsData:     BrandWithModels[];
}

export default function CategoryCreateForm({ config, brandsData }: Props) {
  const router = useRouter();
  // Full config with validators — needed for client-side validation
  const fullConfig = getCategoryConfig(config.slug)!;

  const [values,      setValues]      = useState<Record<string, unknown>>({});
  const [errors,      setErrors]      = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [submitted,   setSubmitted]   = useState(false);

  // Track selected brand for model cascade
  const [selectedBrand, setSelectedBrand] = useState<string>("");

  const modelOptions = useMemo(() => {
    if (!selectedBrand) return [];
    return brandsData.find((b) => b.name === selectedBrand)?.models.map((m) => m.name) ?? [];
  }, [brandsData, selectedBrand]);

  function setValue(key: string, val: unknown) {
    setValues((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    // Client-side validation
    const { errors: zodErrors } = validateSpecsRow(fullConfig, values);
    if (zodErrors.length > 0) {
      const fe: FieldErrors = {};
      for (const err of zodErrors) fe[err.field] = err.message;
      setErrors(fe);
      // Scroll to first error
      const firstKey = zodErrors[0].field;
      document.getElementById(firstKey)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setLoading(true);
    const res = await createCategoryDraftAction(config.slug, values);
    setLoading(false);

    if (!res.success) {
      if (res.fieldErrors) {
        const fe: FieldErrors = {};
        for (const [k, msgs] of Object.entries(res.fieldErrors)) fe[k] = msgs[0];
        setErrors(fe);
      }
      setServerError(res.error);
      return;
    }

    setSubmitted(true);
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="card" style={{ alignItems: "center", textAlign: "center", padding: "2.5rem 1.5rem", gap: 16 }}>
        <CheckCircle2 size={44} style={{ color: "var(--color-success)" }} />
        <div>
          <p style={{ fontWeight: 700, fontSize: "1.0625rem", color: "var(--color-primary)" }}>
            Submitted for review
          </p>
          <p style={{ fontSize: "0.875rem", color: "var(--color-muted-foreground)", marginTop: 6 }}>
            An admin will review your {config.label} listing shortly.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={() => router.push(`/categories/${config.slug}`)}
            className="btn btn--secondary btn--sm"
          >
            View listings
          </button>
          <button
            onClick={() => { setValues({}); setErrors({}); setSubmitted(false); setSelectedBrand(""); }}
            className="btn btn--ghost btn--sm"
          >
            Add another
          </button>
        </div>
      </div>
    );
  }

  // ── Group fields for display ───────────────────────────────────────────────
  // Brand + model always first, then rest in pairs, textarea spans full width
  const fieldGroups: ClientFieldDef[][] = [];
  const remaining = [...config.fields];

  // Pull brand + model as first group
  const brandIdx = remaining.findIndex((f) => f.key === "brand");
  const modelIdx = remaining.findIndex((f) => f.key === "model_name");
  if (brandIdx !== -1 && modelIdx !== -1) {
    fieldGroups.push([remaining[brandIdx], remaining[modelIdx]]);
    remaining.splice(Math.max(brandIdx, modelIdx), 1);
    remaining.splice(Math.min(brandIdx, modelIdx), 1);
  }

  // Remaining: pair up non-textarea fields, textarea alone
  let i = 0;
  while (i < remaining.length) {
    const f = remaining[i];
    if (f.type === "textarea" || f.type === "multiselect") {
      fieldGroups.push([f]);
      i++;
    } else {
      const next = remaining[i + 1];
      if (next && next.type !== "textarea" && next.type !== "multiselect") {
        fieldGroups.push([f, next]);
        i += 2;
      } else {
        fieldGroups.push([f]);
        i++;
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {fieldGroups.map((group, gi) => (
        <div key={gi} className="form-card">
          {group.length === 1 && group[0].key === "brand" ? (
            <p className="form-section-title">Product Details</p>
          ) : gi === 0 ? null : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                group.length === 1 ? "1fr" : "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            {group.map((field) => (
              <div
                key={field.key}
                className="form-group"
                style={
                  field.type === "textarea" || field.type === "multiselect"
                    ? { gridColumn: "1 / -1" }
                    : undefined
                }
              >
                <label className="form-label" htmlFor={field.key}>
                  {field.label}
                  {field.required && (
                    <span style={{ color: "var(--color-accent)", marginLeft: 3 }}>*</span>
                  )}
                  {field.unit && (
                    <span style={{ color: "var(--color-muted-foreground)", fontWeight: 400, fontSize: "0.8125rem" }}>
                      {" "}({field.unit})
                    </span>
                  )}
                </label>

                <FieldInput
                  field={field}
                  value={values[field.key]}
                  onChange={(v) => setValue(field.key, v)}
                  error={errors[field.key]}
                  brands={field.key === "brand" ? brandsData : undefined}
                  selectedBrand={field.key === "model_name" ? selectedBrand : undefined}
                  onBrandChange={field.key === "brand" ? (b) => {
                    setSelectedBrand(b);
                    setValue("model_name", "");
                  } : undefined}
                  modelOptions={field.key === "model_name" ? modelOptions : undefined}
                />

                {errors[field.key] && (
                  <p className="form-error">{errors[field.key]}</p>
                )}

                {/* Hint for optional fields */}
                {!field.required && !errors[field.key] && (
                  <p style={{ fontSize: "0.75rem", color: "var(--color-muted-foreground)", marginTop: 2 }}>
                    Optional
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Server error */}
      {serverError && (
        <div className="alert alert--error">
          <AlertCircle size={14} />
          {serverError}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingBottom: "1rem" }}>
        <Link href={`/categories/${config.slug}`} className="btn btn--ghost">
          Cancel
        </Link>
        <button type="submit" disabled={loading} className="btn btn--primary">
          {loading ? (
            <><span className="spinner" /> Submitting…</>
          ) : (
            "Submit for Review"
          )}
        </button>
      </div>
    </form>
  );
}
