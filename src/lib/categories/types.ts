import { z } from "zod";

// ─── Field types ──────────────────────────────────────────────────────────────
// Each type maps to a specific input component in the form renderer.
// Kept minimal — extend as needed, not speculatively.

export type FieldType =
  | "text"
  | "number"
  | "select"
  | "multiselect"
  | "boolean"
  | "textarea";

// ─── Field definition ─────────────────────────────────────────────────────────
// One entry per column in the form and per column in the CSV.
// The same definition drives form rendering, Zod schema generation,
// CSV header validation, and row-level value coercion.

export interface FieldDef {
  /** Unique key — becomes the key inside Product.specs JSON */
  key: string;

  /** Human-readable label for the form */
  label: string;

  /** Controls which input component is rendered */
  type: FieldType;

  /** If false, field is optional in both form and CSV */
  required: boolean;

  /**
   * Column name in the CSV template (lowercased).
   * Must be unique within a category config.
   * If undefined, the field is form-only (not in CSV).
   */
  csvHeader?: string;

  /**
   * Valid options for select / multiselect fields.
   * Also used to generate the enum validator in schema-builder.
   */
  options?: string[];

  /** Unit hint shown in the form label, e.g. "₹", "GB", "mAh" */
  unit?: string;

  /**
   * Zod validator for this field.
   * schema-builder wraps this with .optional() if required === false.
   * Pre-defining here (rather than inferring) makes each field's
   * constraints explicit and co-located with its definition.
   */
  validator: z.ZodTypeAny;

  /**
   * Optional transform applied to the raw CSV string value
   * before validation. Useful for coercion (e.g. "2499" → 2499).
   * Runs BEFORE the Zod validator, not after.
   */
  csvTransform?: (raw: string) => unknown;
}

// ─── Category config ──────────────────────────────────────────────────────────

export interface CategoryConfig {
  /**
   * Matches the Category enum value in Prisma.
   * Used as the key in the config registry.
   */
  id: "SPARE_PARTS" | "VRP" | "NEW_PHONES" | "PREXO" | "OPEN_BOX";

  /** URL slug used in /categories/[category] */
  slug: "spare-parts" | "vrp" | "new-phones" | "prexo" | "open-box";

  /** Display name used in navigation and headings */
  label: string;

  /** Short description shown in the category picker */
  description: string;

  /**
   * Field definitions — drives form, CSV, and validation.
   * Order matters for CSV template column order.
   */
  fields: FieldDef[];

  /**
   * CSV headers that are REQUIRED (subset of csvHeader values in fields).
   * Header validation fails fast if any of these are missing.
   */
  requiredCsvHeaders: string[];

  /**
   * An example data row for the downloadable CSV template.
   * Keys must match csvHeader values in fields.
   */
  csvExampleRow: Record<string, string>;

  /**
   * Business rules that can't be expressed in field-level Zod validators.
   * Receives the entire validated row object.
   * Return an array of { field, message } for errors, or [] if clean.
   */
  crossFieldValidation?: (
    row: Record<string, unknown>
  ) => { field: string; message: string }[];
}

// ─── Serialisable (client-safe) versions ─────────────────────────────────────
// Strip validator (Zod class) and csvTransform (function) — both are
// non-serialisable and must not be passed from Server → Client Components.

export type ClientFieldDef = Omit<FieldDef, "validator" | "csvTransform">;

export interface ClientCategoryConfig
  extends Omit<CategoryConfig, "fields" | "crossFieldValidation"> {
  fields: ClientFieldDef[];
}

export function toClientConfig(config: CategoryConfig): ClientCategoryConfig {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { crossFieldValidation: _x, fields, ...rest } = config;
  return {
    ...rest,
    fields: fields.map(({ validator: _v, csvTransform: _c, ...field }) => field),
  };
}

// ─── CSV processing types ─────────────────────────────────────────────────────

export interface CsvRowError {
  field: string;
  message: string;
}

export interface CsvRowResult {
  /** 1-indexed row number (header excluded) */
  rowNumber: number;
  raw: Record<string, string>;
  data: Record<string, unknown> | null;
  errors: CsvRowError[];
  valid: boolean;
}

export interface CsvParseResult {
  totalRows: number;
  validRows: CsvRowResult[];
  invalidRows: CsvRowResult[];
  headerErrors: string[];    // fatal — file is rejected
  headerWarnings: string[];  // non-fatal — unknown columns ignored
}

// ─── Progress callback (for 1000+ row UX) ────────────────────────────────────

export interface CsvParseProgress {
  parsed: number;
  total: number;         // -1 if unknown (streaming)
  validSoFar: number;
  invalidSoFar: number;
}

export type OnCsvProgress = (progress: CsvParseProgress) => void;
