// Client-safe image URL utility — no secrets, no server-only imports.
// Works in server components, client components, and edge functions.

// NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is the Cloudinary cloud name (non-secret).
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";

/**
 * Convert a Cloudinary public_id to a full delivery URL.
 * If the value is already a full URL (http/https), it is returned as-is
 * so that legacy DB rows and external scraped URLs keep working.
 *
 * @param publicIdOrUrl  Either a Cloudinary public_id or an existing full URL.
 * @param transforms     Optional Cloudinary transformation string, e.g. "w_400,c_fill".
 */
export function getImageUrl(publicIdOrUrl: string, transforms?: string): string {
  if (!publicIdOrUrl) return "";
  if (publicIdOrUrl.startsWith("http")) return publicIdOrUrl;
  const t = transforms ? `${transforms}/` : "";
  return `https://res.cloudinary.com/${CLOUD}/image/upload/${t}${publicIdOrUrl}`;
}
