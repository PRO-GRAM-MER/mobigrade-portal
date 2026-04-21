import { z } from "zod"

// ── Color normalization ───────────────────────────────────────────────────
export function normalizeColor(c: string): string {
  return c.trim().replace(/\b\w/g, (l) => l.toUpperCase())
}

// ── Admin: create/edit Phone (catalog) ───────────────────────────────────
export const phoneSchema = z.object({
  brandId:     z.string().min(1, "Brand required"),
  name:        z.string().min(2, "Name required"),
  slug:        z.string().min(2, "Slug required").regex(/^[a-z0-9-]+$/, "Slug: lowercase letters, numbers, hyphens only"),
  launchYear:  z.number().int().min(2000).max(2100).optional(),
  description: z.string().optional(),
  isActive:    z.boolean().default(true),
})
export type PhoneInput = z.infer<typeof phoneSchema>

// ── Admin: phone specification ────────────────────────────────────────────
export const phoneSpecSchema = z.object({
  displaySize:       z.number().positive().optional(),
  displayType:       z.string().optional(),
  displayResolution: z.string().optional(),
  displayHz:         z.number().int().positive().optional(),
  chipset:           z.string().optional(),
  cpu:               z.string().optional(),
  gpu:               z.string().optional(),
  rearCamera:        z.string().optional(),
  frontCamera:       z.string().optional(),
  batteryMah:        z.number().int().positive().optional(),
  charging:          z.string().optional(),
  os:                z.string().optional(),
  nfc:               z.boolean().optional(),
  bluetooth:         z.string().optional(),
  wifi:              z.string().optional(),
  usb:               z.string().optional(),
  weightGrams:       z.number().int().positive().optional(),
  dimensions:        z.string().optional(),
  build:             z.string().optional(),
  ip:                z.string().optional(),
  sim:               z.string().optional(),
})
export type PhoneSpecInput = z.infer<typeof phoneSpecSchema>

// ── Seller: create listing ────────────────────────────────────────────────
// Seller picks brand → phone → RAM → storage → color (existing or new variant)
export const sellerListingSchema = z.object({
  phoneId:       z.string().min(1, "Phone required"),
  ram:           z.number().int().positive("RAM required"),      // GB
  storage:       z.number().int().positive("Storage required"),  // GB
  color:         z.string().min(1, "Color required"),
  colorHex:      z.string().optional(),
  price:         z.number().positive("Price required"),
  stock:         z.number().int().positive("Stock required"),
  sku:           z.string().optional(),
  condition:     z.enum(["SEALED", "OPEN_BOX"]).default("SEALED"),
  warrantyMonths: z.number().int().min(0).optional(),
  warrantyType:  z.string().optional(),
})
export type SellerListingInput = z.infer<typeof sellerListingSchema>

// ── CSV row schema ────────────────────────────────────────────────────────
// brand_name,phone_name,ram,storage,color,price,stock,sku,condition,warranty_months,warranty_type,color_hex
export const listingCsvRowSchema = z.object({
  brand_name:      z.string().min(1, "brand_name required"),
  phone_name:      z.string().min(1, "phone_name required"),
  ram:             z.coerce.number().int().positive("ram must be integer GB"),
  storage:         z.coerce.number().int().positive("storage must be integer GB"),
  color:           z.string().min(1, "color required"),
  price:           z.coerce.number().positive("price required"),
  stock:           z.coerce.number().int().positive("stock required"),
  sku:             z.string().optional(),
  condition:       z.enum(["SEALED", "OPEN_BOX"]).default("SEALED"),
  warranty_months: z.coerce.number().int().min(0).optional(),
  warranty_type:   z.string().optional(),
  color_hex:       z.string().optional(),
})
export type ListingCsvRow = z.infer<typeof listingCsvRowSchema>

// ── Admin: update listing (status + notes only, not variant data) ─────────
export const adminUpdateListingSchema = z.object({
  price:          z.number().positive(),
  stock:          z.number().int().min(0),
  condition:      z.enum(["SEALED", "OPEN_BOX"]),
  warrantyMonths: z.number().int().min(0).optional(),
  warrantyType:   z.string().optional(),
  adminNotes:     z.string().optional(),
  status:         z.enum(["DRAFT", "PENDING_REVIEW", "ACTIVE", "REJECTED"]),
})
export type AdminUpdateListingInput = z.infer<typeof adminUpdateListingSchema>

// ── Constants ─────────────────────────────────────────────────────────────
export const COMMON_RAM_OPTIONS     = [2, 3, 4, 6, 8, 10, 12, 16] as const
export const COMMON_STORAGE_OPTIONS = [32, 64, 128, 256, 512, 1024] as const
export const CONDITION_OPTIONS = [
  { value: "SEALED",   label: "Factory Sealed" },
  { value: "OPEN_BOX", label: "Open Box"       },
] as const
export const WARRANTY_TYPE_OPTIONS = ["Brand Warranty", "Seller Warranty"] as const
