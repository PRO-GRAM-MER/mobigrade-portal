"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import {
  validateCsvHeaders,
  validateCsvRow,
  REQUIRED_CSV_HEADERS,
  MAX_CSV_ROWS,
  type CsvRowResult,
} from "@/lib/validations/catalog";
import {
  createCsvBatchAction,
  type RawCsvRow,
} from "@/actions/catalog-actions";

// ─── Step machine ─────────────────────────────────────────────────────────────

type Step = "idle" | "parsing" | "preview" | "uploading";

interface ParseState {
  filename: string;
  rows: CsvRowResult[];
  unknownColumns: string[];
}

interface Props {
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SparePartsUploader({ onClose }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("idle");
  const [parseState, setParseState] = useState<ParseState | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // ── Parse file ─────────────────────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      setParseError("Only .csv files are accepted.");
      return;
    }

    setParseError(null);
    setServerError(null);
    setStep("parsing");

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const rawHeaders = results.meta.fields ?? [];
        const headerCheck = validateCsvHeaders(rawHeaders);

        if (!headerCheck.valid) {
          setParseError(
            `Missing required columns: ${headerCheck.missing.join(", ")}. ` +
              `Required: ${REQUIRED_CSV_HEADERS.join(", ")}`
          );
          setStep("idle");
          return;
        }

        if (results.data.length === 0) {
          setParseError("The CSV has no data rows.");
          setStep("idle");
          return;
        }

        if (results.data.length > MAX_CSV_ROWS) {
          setParseError(
            `File has ${results.data.length} rows — maximum allowed is ${MAX_CSV_ROWS}.`
          );
          setStep("idle");
          return;
        }

        const rows: CsvRowResult[] = results.data.map((raw, i) =>
          validateCsvRow(raw, i + 1)
        );

        setParseState({
          filename: file.name,
          rows,
          unknownColumns: headerCheck.unknown,
        });
        setStep("preview");
      },
      error(err) {
        setParseError(`Failed to parse CSV: ${err.message}`);
        setStep("idle");
      },
    });
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // ── Upload ─────────────────────────────────────────────────────────────────

  async function handleUpload() {
    if (!parseState) return;

    setServerError(null);
    setStep("uploading");

    const rawRows: RawCsvRow[] = parseState.rows.map((r) => ({
      rowNumber: r.rowNumber,
      fields: r.raw,
    }));

    const result = await createCsvBatchAction(parseState.filename, rawRows);

    if (!result.success) {
      setServerError(result.error);
      setStep("preview");
      return;
    }

    // Navigate to batch details — modal closes naturally on route change
    router.push(`/spare-parts/batches/${result.data.batchId}`);
    onClose();
  }

  function reset() {
    setStep("idle");
    setParseState(null);
    setParseError(null);
    setServerError(null);
    setExpandedRow(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ─────────────────────────────────────────────────────────────────────────

  const validCount = parseState?.rows.filter((r) => r.valid).length ?? 0;
  const errorCount = parseState?.rows.filter((r) => !r.valid).length ?? 0;
  // Disabled when: no valid rows, has errors, or currently uploading
  const uploadDisabled = validCount === 0 || errorCount > 0 || step === "uploading";

  // ── Idle / parsing drop zone ─────────────────────────────────────────────

  if (step === "idle" || step === "parsing") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {parseError && (
          <div className="alert alert--error">
            <AlertCircle size={16} />
            {parseError}
          </div>
        )}

        <label
          className="upload-zone"
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            padding: "3rem 1.5rem",
            cursor: step === "parsing" ? "default" : "pointer",
          }}
        >
          <span style={{ fontSize: "2.5rem" }}>📂</span>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--color-primary)" }}>
              {step === "parsing" ? "Parsing…" : "Drop your CSV here, or click to browse"}
            </p>
            <p style={{ fontSize: "0.8rem", color: "var(--color-muted-foreground)", marginTop: "4px" }}>
              .csv only · max {MAX_CSV_ROWS} rows
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="sr-only"
            disabled={step === "parsing"}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>
      </div>
    );
  }

  // ── Preview ────────────────────────────────────────────────────────────────

  if (step === "preview" || step === "uploading") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Summary bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px 14px",
            background: "var(--color-background)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            flexWrap: "wrap",
          }}
        >
          <p
            style={{
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--color-primary)",
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {parseState?.filename}
          </p>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
            <span className="badge badge--green">
              <CheckCircle2 size={11} style={{ marginRight: "3px" }} />
              {validCount} valid
            </span>
            {errorCount > 0 && (
              <span className="badge badge--red">
                <AlertCircle size={11} style={{ marginRight: "3px" }} />
                {errorCount} error{errorCount !== 1 ? "s" : ""}
              </span>
            )}
            <span
              style={{ fontSize: "0.75rem", color: "var(--color-muted-foreground)" }}
            >
              {parseState?.rows.length} total
            </span>
          </div>
        </div>

        {/* Strict validation warning */}
        {errorCount > 0 && (
          <div className="alert alert--error">
            <AlertCircle size={15} />
            <div>
              <strong>Upload blocked</strong> — {errorCount} row{errorCount !== 1 ? "s have" : " has"} validation errors.
              Fix the CSV and re-upload. All rows must be valid before submission.
            </div>
          </div>
        )}

        {parseState?.unknownColumns && parseState.unknownColumns.length > 0 && (
          <div className="alert alert--warning">
            Unknown columns will be ignored: {parseState.unknownColumns.join(", ")}
          </div>
        )}

        {serverError && (
          <div className="alert alert--error">
            <AlertCircle size={15} />
            {serverError}
          </div>
        )}

        {/* Row table */}
        <div
          className="table-wrapper"
          style={{ maxHeight: "320px", overflowY: "auto" }}
        >
          <table className="table" style={{ fontSize: "0.8rem" }}>
            <thead>
              <tr>
                <th style={{ width: "36px" }}>#</th>
                <th>Brand</th>
                <th>Model</th>
                <th>Part</th>
                <th>Cond.</th>
                <th>Price</th>
                <th>Qty</th>
                <th style={{ width: "80px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {parseState?.rows.map((row) => (
                <>
                  <tr
                    key={row.rowNumber}
                    onClick={() =>
                      !row.valid &&
                      setExpandedRow((p) => (p === row.rowNumber ? null : row.rowNumber))
                    }
                    style={{
                      background: !row.valid ? "#fff5f5" : undefined,
                      cursor: !row.valid ? "pointer" : "default",
                    }}
                  >
                    <td style={{ color: "var(--color-muted-foreground)" }}>{row.rowNumber}</td>
                    <td style={{ color: "var(--color-primary)", fontWeight: 500 }}>
                      {row.data?.brand ?? row.raw["brand"] ?? "—"}
                    </td>
                    <td>{row.data?.model_name ?? row.raw["model_name"] ?? "—"}</td>
                    <td style={{ color: "var(--color-primary)" }}>
                      {row.data?.part_name ?? row.raw["part_name"] ?? "—"}
                    </td>
                    <td>{row.data?.condition ?? row.raw["condition"] ?? "—"}</td>
                    <td>
                      {row.data?.price != null
                        ? `₹${row.data.price}`
                        : row.raw["price"] ?? "—"}
                    </td>
                    <td>{row.data?.quantity ?? row.raw["quantity"] ?? "—"}</td>
                    <td>
                      {row.valid ? (
                        <CheckCircle2
                          size={14}
                          style={{ color: "var(--color-success)" }}
                        />
                      ) : (
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "3px",
                            color: "var(--color-error)",
                            fontSize: "0.75rem",
                          }}
                        >
                          {expandedRow === row.rowNumber ? (
                            <ChevronDown size={12} />
                          ) : (
                            <ChevronRight size={12} />
                          )}
                          {row.errors.length}
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Expanded error details */}
                  {!row.valid && expandedRow === row.rowNumber && (
                    <tr style={{ background: "#fff0f0" }}>
                      <td
                        colSpan={8}
                        style={{ padding: "8px 12px" }}
                      >
                        <ul style={{ margin: 0, paddingLeft: "16px" }}>
                          {row.errors.map((e, i) => (
                            <li
                              key={i}
                              style={{
                                fontSize: "0.775rem",
                                color: "var(--color-error)",
                                lineHeight: 1.6,
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
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "4px",
          }}
        >
          <button
            onClick={reset}
            className="btn btn--ghost btn--sm"
            disabled={step === "uploading"}
          >
            ← Re-upload
          </button>

          <button
            onClick={handleUpload}
            disabled={uploadDisabled}
            className="btn btn--secondary btn--sm"
          >
            {step === "uploading" ? (
              <>
                <span className="spinner" />
                Uploading…
              </>
            ) : (
              `Upload ${validCount} row${validCount !== 1 ? "s" : ""}`
            )}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
