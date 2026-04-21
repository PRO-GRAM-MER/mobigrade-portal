import { z } from "zod";
import type { CategoryConfig, FieldDef, CsvRowError } from "./types";

/**
 * Builds a Zod schema for a category's specs object from its FieldDef array.
 *
 * Why generate at runtime instead of hand-writing per category?
 *   - Single source of truth: field definitions live in config, not split
 *     between config + schema files.
 *   - Adding a field = one change in config. No Zod schema to maintain separately.
 *   - Same schema runs on client (form) and server (re-validation). No drift.
 *
 * Trade-off: `z.ZodObject<any>` loses precise TypeScript inference.
 * Acceptable for a config-driven system — runtime correctness is the goal,
 * not compile-time spec shape exhaustion.
 */
export function buildSpecsSchema(
  config: CategoryConfig
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of config.fields) {
    shape[field.key] = field.required
      ? field.validator
      : field.validator.optional();
  }

  return z.object(shape);
}

/**
 * Validates a single parsed row object (keys = field.key, values = coerced).
 * Returns field-level errors plus any cross-field errors from config.
 */
export function validateSpecsRow(
  config: CategoryConfig,
  row: Record<string, unknown>
): { data: Record<string, unknown> | null; errors: CsvRowError[] } {
  const schema = buildSpecsSchema(config);
  const result = schema.safeParse(row);

  if (!result.success) {
    const errors: CsvRowError[] = result.error.issues.map((e) => ({
      field: String(e.path[0] ?? "unknown"),
      message: e.message,
    }));
    return { data: null, errors };
  }

  // Cross-field validation (business rules that span multiple fields)
  const crossErrors = config.crossFieldValidation?.(result.data) ?? [];
  if (crossErrors.length > 0) {
    return { data: null, errors: crossErrors };
  }

  return { data: result.data, errors: [] };
}

/**
 * Coerces a raw CSV string value for a field using:
 * 1. field.csvTransform (explicit transform in config)
 * 2. Type-based fallback coercion for number/boolean
 * 3. Raw string for text/select/multiselect/textarea
 */
export function coerceCsvValue(field: FieldDef, raw: string): unknown {
  const trimmed = raw.trim();

  if (field.csvTransform) {
    return field.csvTransform(trimmed);
  }

  switch (field.type) {
    case "number":
      return trimmed === "" ? undefined : Number(trimmed);
    case "boolean":
      return trimmed.toLowerCase() === "true" || trimmed === "1" || trimmed.toLowerCase() === "yes";
    case "multiselect":
      // Pipe-separated: "SCREEN|BATTERY|CAMERA"
      return trimmed === "" ? [] : trimmed.split("|").map((v) => v.trim());
    default:
      return trimmed === "" ? undefined : trimmed;
  }
}

/**
 * Maps a raw CSV row (header → string) to a coerced specs object
 * (field.key → typed value), then validates it.
 *
 * Column name matching is case-insensitive and trims whitespace.
 */
export function mapAndValidateCsvRow(
  config: CategoryConfig,
  rawRow: Record<string, string>
): { data: Record<string, unknown> | null; errors: CsvRowError[] } {
  // Normalize raw row keys to lowercase+trimmed
  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawRow)) {
    normalized[k.toLowerCase().trim()] = v ?? "";
  }

  // Map CSV columns to field keys, coerce values
  const specsRow: Record<string, unknown> = {};
  for (const field of config.fields) {
    if (!field.csvHeader) continue; // form-only field
    const rawValue = normalized[field.csvHeader] ?? "";
    specsRow[field.key] = coerceCsvValue(field, rawValue);
  }

  return validateSpecsRow(config, specsRow);
}
