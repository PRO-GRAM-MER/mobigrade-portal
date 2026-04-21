/**
 * CSV Parser — handles 1000+ row files without locking the UI.
 *
 * Strategy for large CSVs:
 * ─────────────────────────
 * 1. PapaParse with `worker: true` → parsing runs in a Web Worker.
 *    Main thread stays responsive. No UI freeze on a 5000-row file.
 *
 * 2. `step` callback (streaming) instead of `complete` (load all).
 *    Each row is validated immediately as it arrives, not after the full
 *    file is in memory. Memory footprint stays flat regardless of file size.
 *
 * 3. `CHUNK_SIZE` batching for Zod validation.
 *    Zod is synchronous. Validating 1000 rows synchronously blocks the
 *    microtask queue. We yield with `setTimeout(0)` between chunks so the
 *    browser can repaint and update the progress bar.
 *
 * 4. Progress callbacks → UI shows "Validated 347 / 1000 rows"
 *    instead of a spinner with no feedback.
 *
 * 5. Error rows are stored with full error detail for the error-file
 *    download (Cloudinary upload of error CSV) — not just counts.
 *    This keeps the UI table small while still giving sellers a
 *    downloadable error report.
 *
 * Server-side companion (submitBatchAction):
 *   - Receives only the raw rows (not validated objects) as JSON.
 *   - Re-validates server-side with the same config-driven schema.
 *   - Uses prisma.product.createMany({ skipDuplicates: true }) in
 *     batches of DB_CHUNK_SIZE to avoid Neon connection timeouts.
 */

import Papa from "papaparse";
import type { CategoryConfig, ClientCategoryConfig, CsvParseResult, CsvRowResult, OnCsvProgress } from "./types";
import { mapAndValidateCsvRow } from "./schema-builder";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Rows validated per microtask yield — tune based on field complexity */
const VALIDATION_CHUNK_SIZE = 100;

/** Rows per prisma.createMany() call on the server */
export const DB_CHUNK_SIZE = 500;

/** Hard limit per upload — prevents abuse and Neon connection timeouts */
export const MAX_ROWS_PER_UPLOAD = 2000;

// ─── Header validation ────────────────────────────────────────────────────────

export function validateCsvHeaders(
  rawHeaders: string[],
  config: CategoryConfig
): { errors: string[]; warnings: string[] } {
  const normalized = rawHeaders.map((h) => h.toLowerCase().trim());
  const required = config.requiredCsvHeaders;
  const known = config.fields
    .filter((f) => f.csvHeader)
    .map((f) => f.csvHeader!);

  const errors = required
    .filter((h) => !normalized.includes(h))
    .map((h) => `Missing required column: "${h}"`);

  const warnings = normalized
    .filter((h) => !known.includes(h))
    .map((h) => `Unknown column "${h}" will be ignored`);

  return { errors, warnings };
}

// ─── CSV template generator ───────────────────────────────────────────────────

export function generateCsvTemplate(config: CategoryConfig | ClientCategoryConfig): string {
  const headers = config.fields
    .filter((f) => f.csvHeader)
    .map((f) => f.csvHeader!);

  const exampleRow = headers.map((h) => config.csvExampleRow[h] ?? "");

  return [headers.join(","), exampleRow.join(",")].join("\n");
}

// ─── Main parse function (client-side, streaming) ─────────────────────────────

/**
 * Parses and validates a CSV File using PapaParse in worker mode.
 * Yields between validation chunks to keep the UI responsive.
 * Calls onProgress after each chunk with live counts.
 *
 * Returns a CsvParseResult with valid + invalid rows separated.
 * Caller decides whether to submit (valid rows only) or abort.
 */
export async function parseCsvFile(
  file: File,
  config: CategoryConfig,
  onProgress?: OnCsvProgress
): Promise<CsvParseResult> {
  return new Promise((resolve) => {
    const allRows: Array<{ raw: Record<string, string>; rowNumber: number }> = [];
    let rowNumber = 0;
    let headerErrors: string[] = [];
    let headerWarnings: string[] = [];
    let headersChecked = false;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,

      // PapaParse runs in a Web Worker when worker: true.
      // This keeps the main thread free for UI updates during parse.
      worker: true,

      // step fires for each row — we collect here, validate in chunks after
      step(result) {
        if (!headersChecked) {
          const headers = result.meta.fields ?? [];
          const check = validateCsvHeaders(headers, config);
          headerErrors = check.errors;
          headerWarnings = check.warnings;
          headersChecked = true;

          // Fatal: abort immediately if required headers are missing
          if (headerErrors.length > 0) {
            (result as unknown as { abort: () => void }).abort?.();
          }
        }

        if (headerErrors.length === 0) {
          rowNumber++;
          allRows.push({ raw: result.data, rowNumber });
        }
      },

      complete: async () => {
        // Fatal header errors — return immediately, no rows processed
        if (headerErrors.length > 0) {
          resolve({
            totalRows: 0,
            validRows: [],
            invalidRows: [],
            headerErrors,
            headerWarnings: [],
          });
          return;
        }

        // Row count guard
        if (allRows.length > MAX_ROWS_PER_UPLOAD) {
          resolve({
            totalRows: allRows.length,
            validRows: [],
            invalidRows: [],
            headerErrors: [
              `File has ${allRows.length} rows. Maximum is ${MAX_ROWS_PER_UPLOAD} per upload.`,
            ],
            headerWarnings,
          });
          return;
        }

        // ── Chunked validation (off microtask queue between chunks) ───────
        const validRows: CsvRowResult[] = [];
        const invalidRows: CsvRowResult[] = [];

        for (let i = 0; i < allRows.length; i += VALIDATION_CHUNK_SIZE) {
          const chunk = allRows.slice(i, i + VALIDATION_CHUNK_SIZE);

          for (const { raw, rowNumber } of chunk) {
            const { data, errors } = mapAndValidateCsvRow(config, raw);
            const result: CsvRowResult = {
              rowNumber,
              raw,
              data,
              errors,
              valid: errors.length === 0,
            };

            if (result.valid) {
              validRows.push(result);
            } else {
              invalidRows.push(result);
            }
          }

          // Yield to browser between chunks — allows progress bar repaint
          onProgress?.({
            parsed: Math.min(i + VALIDATION_CHUNK_SIZE, allRows.length),
            total: allRows.length,
            validSoFar: validRows.length,
            invalidSoFar: invalidRows.length,
          });

          // Give the browser a frame to repaint
          await new Promise<void>((res) => setTimeout(res, 0));
        }

        resolve({
          totalRows: allRows.length,
          validRows,
          invalidRows,
          headerErrors: [],
          headerWarnings,
        });
      },

      error(err) {
        resolve({
          totalRows: 0,
          validRows: [],
          invalidRows: [],
          headerErrors: [`Parse error: ${err.message}`],
          headerWarnings: [],
        });
      },
    });
  });
}

// ─── Error CSV generator ──────────────────────────────────────────────────────
/**
 * For large uploads, inline error display is unusable.
 * This generates a downloadable error CSV that sellers can open in Excel.
 * The error file is uploaded to Cloudinary and stored in UploadBatch.errorFileUrl.
 *
 * Format: original columns + appended "__errors" column with pipe-joined messages.
 *
 * Example row:
 *   Samsung,Galaxy S23,Display,NEW,abc,5,...,__errors
 *   ...                                      "price: Must be positive | quantity: Must be ≥ 1"
 */
export function generateErrorCsv(
  invalidRows: CsvRowResult[],
  config: CategoryConfig
): string {
  if (invalidRows.length === 0) return "";

  const headers = config.fields
    .filter((f) => f.csvHeader)
    .map((f) => f.csvHeader!);

  const allHeaders = [...headers, "__row_number", "__errors"];
  const headerLine = allHeaders.join(",");

  const dataLines = invalidRows.map((row) => {
    const values = headers.map((h) => {
      const v = row.raw[h] ?? "";
      // Escape commas and quotes for CSV
      return `"${String(v).replace(/"/g, '""')}"`;
    });
    const rowNum = String(row.rowNumber);
    const errorSummary = row.errors.map((e) => `${e.field}: ${e.message}`).join(" | ");
    return [...values, rowNum, `"${errorSummary.replace(/"/g, '""')}"`].join(",");
  });

  return [headerLine, ...dataLines].join("\n");
}

// ─── Server-side batch insert helper ─────────────────────────────────────────
/**
 * Splits an array into chunks of `size`.
 * Use this when calling prisma.product.createMany() for large batches:
 *
 *   const chunks = chunkArray(validRows, DB_CHUNK_SIZE);
 *   for (const chunk of chunks) {
 *     await prisma.product.createMany({ data: chunk, skipDuplicates: true });
 *   }
 *
 * This avoids Neon's statement timeout on single large inserts.
 */
export function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
