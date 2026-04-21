"use client";

// shadcn components ideal here:
//   <Form>, <FormField>, <FormItem>, <FormLabel>, <FormMessage>  (react-hook-form integration)
//   <Select>, <SelectContent>, <SelectItem>                       (condition + category)
//   <Textarea>                                                    (description)
//   <Input>                                                       (text fields)
//   <Button>                                                      (submit)

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export default function ManualEntryForm() {
  const router = useRouter();
  const [form, setForm] = useState<ProductRowInput>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function set<K extends keyof ProductRowInput>(key: K, value: ProductRowInput[K]) {
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

  if (submitted) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-green-300 bg-green-50 p-8 text-center dark:border-green-800 dark:bg-green-900/20">
        <div className="text-4xl">✓</div>
        <h2 className="mt-3 text-lg font-bold text-green-800 dark:text-green-300">
          Product submitted for review
        </h2>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => router.push("/catalog?tab=products")}
            className="rounded-lg bg-[--brand] px-4 py-2 text-sm font-semibold text-white"
          >
            View products
          </button>
          <button
            onClick={() => {
              setForm(EMPTY);
              setSubmitted(false);
            }}
            className="rounded-lg border border-[--border] px-4 py-2 text-sm font-medium text-[--fg-muted]"
          >
            Add another
          </button>
        </div>
      </div>
    );
  }

  function err(field: keyof ProductRowInput) {
    return errors[field]?.[0];
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-5">
      <div className="rounded-xl border border-[--border] p-6 space-y-5">
        <h2 className="text-base font-semibold text-[--fg]">Product Details</h2>

        {/* Row 1: Brand + Model */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Brand *" error={err("brand")}>
            <input
              className="input-base w-full"
              placeholder="Samsung"
              value={form.brand}
              onChange={(e) => set("brand", e.target.value)}
            />
          </Field>
          <Field label="Compatible Model *" error={err("model_name")}>
            <input
              className="input-base w-full"
              placeholder="Galaxy S23"
              value={form.model_name}
              onChange={(e) => set("model_name", e.target.value)}
            />
          </Field>
        </div>

        {/* Row 2: Part name + Part number */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Part Name *" error={err("part_name")}>
            <input
              className="input-base w-full"
              placeholder="Display Assembly"
              value={form.part_name}
              onChange={(e) => set("part_name", e.target.value)}
            />
          </Field>
          <Field label="Part Number / SKU" error={err("part_number")}>
            <input
              className="input-base w-full"
              placeholder="SAM-S23-DISP (optional)"
              value={form.part_number ?? ""}
              onChange={(e) => set("part_number", e.target.value)}
            />
          </Field>
        </div>

        {/* Row 3: Category + Condition */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category" error={err("category")}>
            {/* shadcn <Select> replaces this */}
            <input
              className="input-base w-full"
              placeholder="Display (optional)"
              value={form.category ?? ""}
              onChange={(e) => set("category", e.target.value)}
            />
          </Field>
          <Field label="Condition *" error={err("condition")}>
            {/* shadcn <Select> replaces this native select */}
            <select
              className="input-base w-full"
              value={form.condition}
              onChange={(e) => set("condition", e.target.value as typeof form.condition)}
            >
              {PART_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Row 4: Price + Quantity */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Price (₹) *" error={err("price")}>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-sm text-[--fg-muted]">
                ₹
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="input-base w-full pl-7"
                placeholder="0.00"
                value={form.price || ""}
                onChange={(e) => set("price", parseFloat(e.target.value) || 0)}
              />
            </div>
          </Field>
          <Field label="Quantity *" error={err("quantity")}>
            <input
              type="number"
              min="1"
              step="1"
              className="input-base w-full"
              placeholder="1"
              value={form.quantity || ""}
              onChange={(e) => set("quantity", parseInt(e.target.value, 10) || 0)}
            />
          </Field>
        </div>

        {/* Description */}
        <Field label="Description" error={err("description")}>
          {/* shadcn <Textarea> replaces this */}
          <textarea
            className="input-base w-full resize-none"
            rows={3}
            placeholder="Optional product description (max 1000 chars)"
            maxLength={1000}
            value={form.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>
      </div>

      {/* Condition guide */}
      <div className="rounded-xl border border-[--border] bg-[--bg] p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[--fg-muted]">
          Condition Guide
        </p>
        <ul className="space-y-1 text-xs text-[--fg-muted]">
          <li><strong className="text-[--fg]">NEW</strong> — Brand new, original manufacturer packaging</li>
          <li><strong className="text-[--fg]">OEM</strong> — Original part pulled from a working device</li>
          <li><strong className="text-[--fg]">AFTERMARKET</strong> — Third-party compatible replacement</li>
          <li><strong className="text-[--fg]">REFURBISHED</strong> — Used, tested, and restored to working order</li>
        </ul>
      </div>

      {serverError && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {serverError}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setForm(EMPTY);
            setErrors({});
            setServerError(null);
          }}
          className="rounded-lg border border-[--border] px-4 py-2 text-sm font-medium text-[--fg-muted] hover:border-[--brand]"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[--brand] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Submitting…" : "Submit for review"}
        </button>
      </div>
    </form>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-[--fg-muted]">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
