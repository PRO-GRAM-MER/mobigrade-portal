import { z } from "zod";

// ─── Regex constants ──────────────────────────────────────────────────────────

const GST_REGEX     = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const AADHAAR_REGEX = /^\d{12}$/;
const PAN_REGEX     = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const CLOUDINARY_URL_REGEX = /^https:\/\/res\.cloudinary\.com\//;

const cloudinaryUrl = z
  .string()
  .regex(CLOUDINARY_URL_REGEX, "Invalid upload — please upload the document again");

const cloudinaryPublicId = z
  .string()
  .min(1, "Upload incomplete — public ID missing");

// ─── Schema — at least GST *or* Aadhaar+PAN must be provided ─────────────────

export const kycSchema = z
  .object({
    gstNumber: z
      .string()
      .toUpperCase()
      .regex(GST_REGEX, "Invalid GST number (format: 22AAAAA0000A1Z5)")
      .optional()
      .or(z.literal("")),

    aadhaarNumber: z
      .string()
      .regex(AADHAAR_REGEX, "Aadhaar must be exactly 12 digits")
      .optional()
      .or(z.literal("")),

    aadhaarImageUrl: cloudinaryUrl.optional().or(z.literal("")),
    aadhaarPublicId: cloudinaryPublicId.optional().or(z.literal("")),

    panNumber: z
      .string()
      .toUpperCase()
      .regex(PAN_REGEX, "Invalid PAN number (format: ABCDE1234F)")
      .optional()
      .or(z.literal("")),

    panImageUrl: cloudinaryUrl.optional().or(z.literal("")),
    panPublicId: cloudinaryPublicId.optional().or(z.literal("")),
  })
  .refine(
    (d) => {
      const hasGst     = !!d.gstNumber;
      const hasAadhaar = !!(d.aadhaarNumber && d.aadhaarImageUrl && d.panNumber && d.panImageUrl);
      return hasGst || hasAadhaar;
    },
    {
      message:
        "Provide either a valid GST number or complete Aadhaar + PAN details with document images.",
    }
  );

export type KycInput = z.infer<typeof kycSchema>;

// ─── Client-side file validation ──────────────────────────────────────────────

export const KYC_FILE_RULES = {
  allowedTypes: ["image/jpeg", "image/png", "application/pdf"],
  maxBytes: 5 * 1024 * 1024,
} as const;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateKycFile(file: File): FileValidationResult {
  if (!KYC_FILE_RULES.allowedTypes.includes(file.type as never)) {
    return { valid: false, error: "Only JPG, PNG, or PDF allowed" };
  }
  if (file.size > KYC_FILE_RULES.maxBytes) {
    return { valid: false, error: "File must be under 5 MB" };
  }
  return { valid: true };
}
