import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

export { cloudinary };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SignedUploadParams {
  signature: string;
  timestamp: number;
  /** Explicit public_id — guarantees the file is stored at this path regardless of folder mode. */
  publicId: string;
  cloudName: string;
  apiKey: string;
  allowedFormats: string;
  maxFileSize: number;
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  format: string;
  bytes: number;
}

// ─── Upload path helpers ──────────────────────────────────────────────────────

export const CLOUDINARY_FOLDERS = {
  kyc:    (userId: string) => `mobigrade/kyc/${userId}`,
  avatar: (userId: string) => `mobigrade/avatars/${userId}`,
} as const;

// ─── Generate signed upload params (called server-side) ───────────────────────
// Uses an explicit public_id so the file is stored at a predictable path in
// Cloudinary regardless of whether the account uses "Fixed" or "Dynamic" folder
// mode — both modes respect an explicit public_id in the signed params.

// ─── Upload constraints ───────────────────────────────────────────────────────
// These are signed into the upload params — Cloudinary enforces them server-side.
// Any client upload that violates these will receive a 400 from Cloudinary.

const UPLOAD_ALLOWED_FORMATS = "jpg,jpeg,png,webp,pdf";
const UPLOAD_MAX_BYTES        = 5 * 1024 * 1024; // 5 MB

export function generateSignedUploadParams(
  userId: string,
  folder?: string,
): SignedUploadParams {
  const timestamp = Math.round(Date.now() / 1000);
  const baseFolder = folder ?? CLOUDINARY_FOLDERS.kyc(userId);
  // Unique suffix — timestamp + 6 random chars
  const suffix = `${timestamp}_${Math.random().toString(36).slice(2, 8)}`;
  const publicId = `${baseFolder}/${suffix}`;

  // Sign all upload constraints — Cloudinary rejects any upload that doesn't
  // match the signed params exactly, preventing format/size abuse.
  const paramsToSign = {
    public_id:       publicId,
    timestamp,
    allowed_formats: UPLOAD_ALLOWED_FORMATS,
    max_file_size:   UPLOAD_MAX_BYTES,
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!,
  );

  return {
    signature,
    timestamp,
    publicId,
    cloudName:      process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey:         process.env.CLOUDINARY_API_KEY!,
    allowedFormats: UPLOAD_ALLOWED_FORMATS,
    maxFileSize:    UPLOAD_MAX_BYTES,
  };
}

// ─── Delete a Cloudinary asset by public_id (called server-side) ──────────────

export async function deleteCloudinaryAsset(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    console.error(`[cloudinary] Failed to delete asset: ${publicId}`);
  }
}
