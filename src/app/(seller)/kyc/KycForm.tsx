"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { submitKycAction } from "@/actions/kyc-actions";
import { validateKycFile } from "@/lib/validations/kyc";
import type { KycInput } from "@/lib/validations/kyc";
import type { SignedUploadParams, CloudinaryUploadResult } from "@/lib/cloudinary";

// ─── Types ────────────────────────────────────────────────────────────────────

type DocumentType = "GST" | "AADHAAR_PAN";

interface UploadedFile {
  url: string;
  publicId: string;
  previewUrl?: string; // local object URL for image preview
}

interface UploadState {
  aadhaar: UploadedFile | null;
  pan: UploadedFile | null;
}

interface FieldErrors {
  gstNumber?: string[];
  aadhaarNumber?: string[];
  aadhaarImageUrl?: string[];
  panNumber?: string[];
  panImageUrl?: string[];
}

// ─── Direct Cloudinary upload ─────────────────────────────────────────────────
// Fetches a server-signed token, then POSTs the file directly to Cloudinary.
// Returns { secure_url, public_id } on success.

async function uploadToCloudinary(file: File): Promise<CloudinaryUploadResult> {
  // 1. Get signed params from our server
  const sigRes = await fetch("/api/kyc/upload-signature");
  if (!sigRes.ok) throw new Error("Failed to get upload signature");
  const params: SignedUploadParams = await sigRes.json();

  // 2. POST directly to Cloudinary
  const formData = new FormData();
  formData.append("file", file);
  formData.append("signature", params.signature);
  formData.append("timestamp", String(params.timestamp));
  formData.append("public_id", params.publicId);
  formData.append("api_key", params.apiKey);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${params.cloudName}/auto/upload`,
    { method: "POST", body: formData }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json();
    throw new Error(err.error?.message ?? "Upload failed");
  }

  return uploadRes.json();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KycForm() {
  const router = useRouter();
  const [docType, setDocType] = useState<DocumentType>("GST");
  const [gstNumber, setGstNumber] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [uploads, setUploads] = useState<UploadState>({ aadhaar: null, pan: null });
  const [uploading, setUploading] = useState<{ aadhaar: boolean; pan: boolean }>({
    aadhaar: false,
    pan: false,
  });
  const [fileErrors, setFileErrors] = useState<{ aadhaar?: string; pan?: string }>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const aadhaarInputRef = useRef<HTMLInputElement>(null);
  const panInputRef = useRef<HTMLInputElement>(null);

  // ── File upload handler ────────────────────────────────────────────────────

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    field: "aadhaar" | "pan"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation before upload
    const validation = validateKycFile(file);
    if (!validation.valid) {
      setFileErrors((prev) => ({ ...prev, [field]: validation.error }));
      e.target.value = "";
      return;
    }

    setFileErrors((prev) => ({ ...prev, [field]: undefined }));
    setUploading((prev) => ({ ...prev, [field]: true }));

    try {
      const result = await uploadToCloudinary(file);

      // Local preview for images (PDF won't have a meaningful preview)
      const previewUrl = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined;

      setUploads((prev) => ({
        ...prev,
        [field]: { url: result.secure_url, publicId: result.public_id, previewUrl },
      }));

      // Clear field error if user re-uploaded
      setFieldErrors((prev) => ({
        ...prev,
        [`${field}ImageUrl`]: undefined,
      }));
    } catch (err) {
      setFileErrors((prev) => ({
        ...prev,
        [field]: err instanceof Error ? err.message : "Upload failed. Try again.",
      }));
    } finally {
      setUploading((prev) => ({ ...prev, [field]: false }));
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});
    setSubmitting(true);

    const payload: KycInput = {
      gstNumber,
      aadhaarNumber,
      aadhaarImageUrl: uploads.aadhaar?.url ?? "",
      aadhaarPublicId: uploads.aadhaar?.publicId ?? "",
      panNumber,
      panImageUrl: uploads.pan?.url ?? "",
      panPublicId: uploads.pan?.publicId ?? "",
    };

    const result = await submitKycAction(payload);

    setSubmitting(false);

    if (!result.success) {
      if (result.fieldErrors) setFieldErrors(result.fieldErrors as FieldErrors);
      if (result.error) setServerError(result.error);
      return;
    }

    router.refresh(); // Re-runs the server page → shows "Under Review" state
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function err(field: keyof FieldErrors) {
    return fieldErrors[field]?.[0];
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Document type selector */}
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-[--fg]">
          Choose verification type
        </legend>
        <div className="flex gap-3">
          {(["GST", "AADHAAR_PAN"] as const).map((type) => (
            <label
              key={type}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors ${
                docType === type
                  ? "border-[--brand] bg-blue-50 text-[--brand] dark:bg-blue-950/30"
                  : "border-[--border] text-[--fg-muted] hover:border-[--brand]/40"
              }`}
            >
              <input
                type="radio"
                name="docType"
                value={type}
                checked={docType === type}
                onChange={() => setDocType(type)}
                className="accent-[--brand]"
              />
              {type === "GST" ? "GST Number" : "Aadhaar + PAN"}
            </label>
          ))}
        </div>
      </fieldset>

      {/* GST path */}
      {docType === "GST" && (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-[--fg-muted]">
            GST Number
          </label>
          <input
            type="text"
            value={gstNumber}
            onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
            placeholder="22AAAAA0000A1Z5"
            maxLength={15}
            className="input-base w-full"
          />
          {err("gstNumber") && <p className="text-xs text-red-500">{err("gstNumber")}</p>}
        </div>
      )}

      {/* Aadhaar + PAN path */}
      {docType === "AADHAAR_PAN" && (
        <div className="space-y-5">
          {/* Aadhaar */}
          <div className="rounded-xl border border-[--border] p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[--fg]">Aadhaar Details</h3>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-[--fg-muted]">
                Aadhaar Number
              </label>
              <input
                type="text"
                value={aadhaarNumber}
                onChange={(e) =>
                  setAadhaarNumber(e.target.value.replace(/\D/g, "").slice(0, 12))
                }
                placeholder="123456789012"
                inputMode="numeric"
                className="input-base w-full"
              />
              {err("aadhaarNumber") && (
                <p className="text-xs text-red-500">{err("aadhaarNumber")}</p>
              )}
            </div>

            <FileUploadField
              label="Aadhaar Card Image"
              uploaded={uploads.aadhaar}
              uploading={uploading.aadhaar}
              fileError={fileErrors.aadhaar}
              fieldError={err("aadhaarImageUrl")}
              inputRef={aadhaarInputRef}
              onChange={(e) => handleFileChange(e, "aadhaar")}
              onClear={() => {
                setUploads((prev) => ({ ...prev, aadhaar: null }));
                if (aadhaarInputRef.current) aadhaarInputRef.current.value = "";
              }}
            />
          </div>

          {/* PAN */}
          <div className="rounded-xl border border-[--border] p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[--fg]">PAN Details</h3>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-[--fg-muted]">
                PAN Number
              </label>
              <input
                type="text"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase().slice(0, 10))}
                placeholder="ABCDE1234F"
                className="input-base w-full"
              />
              {err("panNumber") && (
                <p className="text-xs text-red-500">{err("panNumber")}</p>
              )}
            </div>

            <FileUploadField
              label="PAN Card Image"
              uploaded={uploads.pan}
              uploading={uploading.pan}
              fileError={fileErrors.pan}
              fieldError={err("panImageUrl")}
              inputRef={panInputRef}
              onChange={(e) => handleFileChange(e, "pan")}
              onClear={() => {
                setUploads((prev) => ({ ...prev, pan: null }));
                if (panInputRef.current) panInputRef.current.value = "";
              }}
            />
          </div>
        </div>
      )}

      {serverError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || uploading.aadhaar || uploading.pan}
        className="w-full rounded-lg bg-[--brand] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit for verification"}
      </button>
    </form>
  );
}

// ─── FileUploadField ──────────────────────────────────────────────────────────

interface FileUploadFieldProps {
  label: string;
  uploaded: UploadedFile | null;
  uploading: boolean;
  fileError?: string;
  fieldError?: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}

function FileUploadField({
  label,
  uploaded,
  uploading,
  fileError,
  fieldError,
  inputRef,
  onChange,
  onClear,
}: FileUploadFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-[--fg-muted]">{label}</label>

      {uploaded ? (
        <div className="flex items-center gap-3 rounded-lg border border-green-300 bg-green-50 px-3 py-2 dark:border-green-800 dark:bg-green-900/20">
          {uploaded.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={uploaded.previewUrl}
              alt="preview"
              className="h-10 w-10 rounded object-cover"
            />
          ) : (
            <span className="text-xl">📄</span>
          )}
          <span className="flex-1 truncate text-xs text-green-700 dark:text-green-400">
            Uploaded successfully
          </span>
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-red-500 hover:underline"
          >
            Remove
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[--border] px-4 py-5 text-sm text-[--fg-muted] hover:border-[--brand]/50 hover:text-[--brand]">
          {uploading ? (
            <span>Uploading…</span>
          ) : (
            <>
              <span>↑</span>
              <span>Click to upload (JPG, PNG, PDF · max 5 MB)</span>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={onChange}
            disabled={uploading}
            className="sr-only"
          />
        </label>
      )}

      {(fileError || fieldError) && (
        <p className="text-xs text-red-500">{fileError ?? fieldError}</p>
      )}
    </div>
  );
}
