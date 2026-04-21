"use client";

// shadcn component suggestions for this file:
//   <Alert>, <AlertDescription>   → error/warning banners
//   <Progress>                    → upload progress bar
//   <Table>                       → preview rows
//   <Badge>                       → row status chip
//   <Sheet>                       → slide-over panel for row error details
//   <Button>                      → submit / download template / retry

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import {
  validateCsvHeaders,
  validateCsvRow,
  CSV_TEMPLATE_ROWS,
  REQUIRED_CSV_HEADERS,
  MAX_CSV_ROWS,
  type CsvRowResult,
} from "@/lib/validations/catalog";
import { submitCsvBatchAction, type RawCsvRow } from "@/actions/catalog-actions";

// ─── Step machine ─────────────────────────────────────────────────────────────

type Step = "idle" | "parsing" | "preview" | "submitting" | "done";

interface ParseState {
  filename: string;
  rows: CsvRowResult[];
  headerWarnings: string[]; // unknown columns — warn, don't block
}

export default function CsvUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("idle");
  const [parseState, setParseState] = useState<ParseState | null>(null);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<{
    validRows: number;
    errorRows: number;
  } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // ── Parse CSV on file pick ─────────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      setHeaderError("Only .csv files are supported.");
      return;
    }

    setHeaderError(null);
    setStep("parsing");

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const rawHeaders = results.meta.fields ?? [];

        // 1. Header check
        const headerValidation = validateCsvHeaders(rawHeaders);
        if (!headerValidation.valid) {
          setHeaderError(
            `Missing required columns: ${headerValidation.missing.join(", ")}. ` +
              `Required: ${REQUIRED_CSV_HEADERS.join(", ")}`
          );
          setStep("idle");
          return;
        }

        if (results.data.length === 0) {
          setHeaderError("The CSV file has no data rows.");
          setStep("idle");
          return;
        }

        if (results.data.length > MAX_CSV_ROWS) {
          setHeaderError(
            `File has ${results.data.length} rows. Maximum allowed is ${MAX_CSV_ROWS}.`
          );
          setStep("idle");
          return;
        }

        // 2. Row-by-row validation
        const rows: CsvRowResult[] = results.data.map((raw, i) =>
          validateCsvRow(raw, i + 1)
        );

        setParseState({
          filename: file.name,
          rows,
          headerWarnings: headerValidation.unknown,
        });
        setStep("preview");
      },
      error(err) {
        setHeaderError(`Failed to parse CSV: ${err.message}`);
        setStep("idle");
      },
    });
  }, []);

  // Drag-and-drop handlers
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // ── Submit valid rows ──────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!parseState) return;

    const validRows = parseState.rows.filter((r) => r.valid);
    if (validRows.length === 0) {
      setServerError("No valid rows to submit. Fix the errors and re-upload.");
      return;
    }

    setStep("submitting");
    setServerError(null);

    // Send ALL rows — server decides valid vs invalid storage
    const rawRows: RawCsvRow[] = parseState.rows.map((r) => ({
      rowNumber: r.rowNumber,
      fields: r.raw,
    }));

    const result = await submitCsvBatchAction(parseState.filename, rawRows);

    if (!result.success) {
      setServerError(result.error);
      setStep("preview");
      return;
    }

    setSubmitResult({
      validRows: result.data.validRows,
      errorRows: result.data.errorRows,
    });
    setStep("done");
  }

  // ── Template download ──────────────────────────────────────────────────────

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE_ROWS], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mobigrade_spare_parts_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function reset() {
    setStep("idle");
    setParseState(null);
    setHeaderError(null);
    setServerError(null);
    setSubmitResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (step === "done" && submitResult) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-green-300 bg-green-50 p-8 text-center dark:border-green-800 dark:bg-green-900/20">
        <div className="text-4xl">✓</div>
        <h2 className="mt-3 text-xl font-bold text-green-800 dark:text-green-300">
          Upload submitted
        </h2>
        <p className="mt-2 text-sm text-green-700 dark:text-green-400">
          <strong>{submitResult.validRows}</strong> product
          {submitResult.validRows !== 1 ? "s" : ""} sent for review
          {submitResult.errorRows > 0 && (
            <>
              {" "}· <strong>{submitResult.errorRows}</strong> rows had errors and were skipped
            </>
          )}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => router.push("/catalog?tab=products")}
            className="rounded-lg bg-[--brand] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            View products
          </button>
          <button
            onClick={reset}
            className="rounded-lg border border-[--border] px-4 py-2 text-sm font-medium text-[--fg-muted] hover:border-[--brand]"
          >
            Upload another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Template download */}
      <div className="flex items-center justify-between rounded-xl border border-[--border] bg-[--bg] px-4 py-3">
        <div>
          <p className="text-sm font-medium text-[--fg]">CSV Template</p>
          <p className="text-xs text-[--fg-muted]">
            Required: {REQUIRED_CSV_HEADERS.join(", ")}
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="rounded-lg border border-[--border] px-3 py-1.5 text-xs font-medium text-[--fg-muted] hover:border-[--brand] hover:text-[--brand]"
        >
          ↓ Download template
        </button>
      </div>

      {/* Dropzone — shadcn doesn't have a native dropzone; this or react-dropzone */}
      {step === "idle" || step === "parsing" ? (
        <label
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[--border] py-16 transition-colors hover:border-[--brand]/60"
        >
          <span className="text-4xl text-[--fg-muted]">📂</span>
          <div className="text-center">
            <p className="text-sm font-medium text-[--fg]">
              {step === "parsing" ? "Parsing…" : "Drop your CSV here, or click to browse"}
            </p>
            <p className="mt-1 text-xs text-[--fg-subtle]">
              .csv only · max {MAX_CSV_ROWS} rows
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            disabled={step === "parsing"}
          />
        </label>
      ) : null}

      {/* Header error */}
      {headerError && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {headerError}
        </div>
      )}

      {/* Preview */}
      {step === "preview" && parseState && (
        <PreviewTable
          parseState={parseState}
          expandedRow={expandedRow}
          onToggleRow={(n) => setExpandedRow((prev) => (prev === n ? null : n))}
          onSubmit={handleSubmit}
          onReset={reset}
          submitting={false}
          serverError={serverError}
        />
      )}

      {step === "submitting" && (
        <div className="flex items-center justify-center gap-3 py-12 text-sm text-[--fg-muted]">
          <span className="animate-spin">⏳</span>
          Submitting {parseState?.rows.filter((r) => r.valid).length} products…
        </div>
      )}
    </div>
  );
}

// ─── PreviewTable ─────────────────────────────────────────────────────────────
// Shows all parsed rows with valid/invalid status.
// shadcn <Table> + <Sheet> (for row error details) ideal here.

interface PreviewProps {
  parseState: ParseState;
  expandedRow: number | null;
  onToggleRow: (n: number) => void;
  onSubmit: () => void;
  onReset: () => void;
  submitting: boolean;
  serverError: string | null;
}

function PreviewTable({
  parseState,
  expandedRow,
  onToggleRow,
  onSubmit,
  onReset,
  submitting,
  serverError,
}: PreviewProps) {
  const { rows, filename, headerWarnings } = parseState;
  const validCount = rows.filter((r) => r.valid).length;
  const errorCount = rows.filter((r) => !r.valid).length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[--border] bg-[--bg] px-4 py-3 text-sm">
        <span className="font-medium text-[--fg] truncate">{filename}</span>
        <span className="ml-auto flex items-center gap-3">
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            {validCount} valid
          </span>
          {errorCount > 0 && (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-600">
              {errorCount} error{errorCount !== 1 ? "s" : ""}
            </span>
          )}
          <span className="text-xs text-[--fg-subtle]">{rows.length} total</span>
        </span>
      </div>

      {/* Unknown column warning */}
      {headerWarnings.length > 0 && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-2 text-xs text-yellow-700 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
          Unknown columns ignored: {headerWarnings.join(", ")}
        </div>
      )}

      {serverError && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {serverError}
        </div>
      )}

      {/* Row table — shadcn <Table> replaces this */}
      <div className="overflow-x-auto rounded-xl border border-[--border]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[--border] bg-[--bg]">
              <th className="w-10 px-3 py-2 text-left text-[--fg-subtle]">#</th>
              <th className="px-3 py-2 text-left text-[--fg-muted]">Brand</th>
              <th className="px-3 py-2 text-left text-[--fg-muted]">Model</th>
              <th className="px-3 py-2 text-left text-[--fg-muted]">Part</th>
              <th className="px-3 py-2 text-left text-[--fg-muted]">Condition</th>
              <th className="px-3 py-2 text-left text-[--fg-muted]">Price</th>
              <th className="px-3 py-2 text-left text-[--fg-muted]">Qty</th>
              <th className="w-20 px-3 py-2 text-left text-[--fg-muted]">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <>
                <tr
                  key={row.rowNumber}
                  onClick={() => !row.valid && onToggleRow(row.rowNumber)}
                  className={`border-b border-[--border] last:border-0 ${
                    !row.valid
                      ? "cursor-pointer bg-red-50/50 dark:bg-red-900/10"
                      : "hover:bg-[--bg]"
                  }`}
                >
                  <td className="px-3 py-2 text-[--fg-subtle]">{row.rowNumber}</td>
                  <td className="px-3 py-2 text-[--fg]">
                    {row.data?.brand ?? row.raw["brand"] ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-[--fg-muted]">
                    {row.data?.model_name ?? row.raw["model_name"] ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-[--fg]">
                    {row.data?.part_name ?? row.raw["part_name"] ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-[--fg-muted]">
                    {row.data?.condition ?? row.raw["condition"] ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-[--fg]">
                    {row.data?.price != null ? `₹${row.data.price}` : row.raw["price"] ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-[--fg-muted]">
                    {row.data?.quantity ?? row.raw["quantity"] ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    {row.valid ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-red-500">
                        ✕ {row.errors.length} error{row.errors.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </td>
                </tr>

                {/* Expanded error row — shadcn <Sheet> is a better UX here */}
                {!row.valid && expandedRow === row.rowNumber && (
                  <tr className="bg-red-50 dark:bg-red-900/10">
                    <td colSpan={8} className="px-4 py-2">
                      <ul className="space-y-0.5">
                        {row.errors.map((e, i) => (
                          <li key={i} className="text-xs text-red-600 dark:text-red-400">
                            <span className="font-medium">{e.field}:</span> {e.message}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onReset}
          className="text-sm text-[--fg-muted] hover:text-[--fg] hover:underline"
        >
          ← Re-upload
        </button>

        <div className="flex items-center gap-3">
          {errorCount > 0 && (
            <p className="text-xs text-[--fg-muted]">
              {errorCount} row{errorCount !== 1 ? "s" : ""} will be skipped
            </p>
          )}
          <button
            onClick={onSubmit}
            disabled={submitting || validCount === 0}
            className="rounded-lg bg-[--brand] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {submitting
              ? "Submitting…"
              : `Submit ${validCount} product${validCount !== 1 ? "s" : ""} for review`}
          </button>
        </div>
      </div>
    </div>
  );
}
