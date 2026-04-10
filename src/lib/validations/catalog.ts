import { z } from "zod";

// ─── Constants ────────────────────────────────────────────────────────────────

export const PART_CONDITIONS = ["NEW", "OEM", "AFTERMARKET", "REFURBISHED"] as const;
export type PartCondition = (typeof PART_CONDITIONS)[number];

export const MAX_CSV_ROWS = 500;

// ─── CSV header contract ──────────────────────────────────────────────────────

export const REQUIRED_CSV_HEADERS = [
  "brand",
  "model_name",
  "part_name",
  "condition",
  "price",
  "quantity",
] as const;

export const OPTIONAL_CSV_HEADERS = [
  "part_number",
  "category",
  "description",
] as const;

export const ALL_CSV_HEADERS = [
  ...REQUIRED_CSV_HEADERS,
  ...OPTIONAL_CSV_HEADERS,
] as const;

export type CsvHeader = (typeof ALL_CSV_HEADERS)[number];

// ─── Single product row schema ────────────────────────────────────────────────
// Zod 4: required_error/invalid_type_error removed — use message/error instead.

export const productRowSchema = z.object({
  brand:       z.string().min(1, "Brand is required").max(100, "Brand too long"),
  model_name:  z.string().min(1, "Model name is required").max(200, "Model name too long"),
  part_name:   z.string().min(1, "Part name is required").max(200, "Part name too long"),

  part_number: z.string().max(100, "Part number too long").optional().or(z.literal("")),
  category:    z.string().max(100, "Category too long").optional().or(z.literal("")),

  condition: z.enum(PART_CONDITIONS, {
    error: `Must be one of: ${PART_CONDITIONS.join(", ")}`,
  }),

  price: z.coerce
    .number({ error: "Price must be a number" })
    .positive("Price must be greater than 0")
    .refine((v) => Number((v * 100).toFixed(0)) === Math.round(v * 100), {
      message: "Price can have at most 2 decimal places",
    }),

  quantity: z.coerce
    .number({ error: "Quantity must be a number" })
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(99999, "Quantity too large"),

  description: z.string().max(1000, "Description too long (max 1000 chars)").optional().or(z.literal("")),
});

export type ProductRowInput = z.infer<typeof productRowSchema>;

// ─── CSV row result ───────────────────────────────────────────────────────────

export interface RowError {
  field: string;
  message: string;
}

export interface CsvRowResult {
  rowNumber: number;
  raw: Record<string, string>;
  data: ProductRowInput | null;
  errors: RowError[];
  valid: boolean;
}

// ─── Header validation ────────────────────────────────────────────────────────

export interface HeaderValidation {
  valid: boolean;
  missing: string[];
  unknown: string[];
}

export function validateCsvHeaders(rawHeaders: string[]): HeaderValidation {
  const normalized = rawHeaders.map((h) => h.toLowerCase().trim());
  const missing = REQUIRED_CSV_HEADERS.filter((r) => !normalized.includes(r));
  const known = ALL_CSV_HEADERS as readonly string[];
  const unknown = normalized.filter((h) => !known.includes(h));

  return { valid: missing.length === 0, missing, unknown };
}

// ─── Row validation ───────────────────────────────────────────────────────────

export function validateCsvRow(
  raw: Record<string, string>,
  rowNumber: number
): CsvRowResult {
  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    normalized[k.toLowerCase().trim()] = typeof v === "string" ? v.trim() : "";
  }

  const result = productRowSchema.safeParse(normalized);

  if (result.success) {
    return { rowNumber, raw, data: result.data, errors: [], valid: true };
  }

  // Zod 4: ZodError.issues (was .errors in Zod 3)
  const errors: RowError[] = result.error.issues.map((e) => ({
    field: String(e.path[0] ?? "unknown"),
    message: e.message,
  }));

  return { rowNumber, raw, data: null, errors, valid: false };
}

// ─── CSV template download content ───────────────────────────────────────────

export const CSV_TEMPLATE_ROWS = [
  ALL_CSV_HEADERS.join(","),
  "Samsung,Galaxy S23,Display Assembly,SAM-S23-DISP,Display,NEW,2499.00,10,Original OLED display",
  "Apple,iPhone 14,Battery,APL-IP14-BAT,Battery,OEM,799.00,25,",
  "Xiaomi,Redmi Note 12,Back Panel,,Housing,AFTERMARKET,299.00,50,Matte black finish",
].join("\n");
