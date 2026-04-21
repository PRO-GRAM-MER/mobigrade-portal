import { z } from "zod";

// ─── Draft review actions ──────────────────────────────────────────────────────

export const rejectDraftSchema = z.object({
  reason: z
    .string()
    .min(10, "Rejection reason must be at least 10 characters")
    .max(500, "Reason too long"),
});

export const requestChangesSchema = z.object({
  reason: z
    .string()
    .min(10, "Please describe what needs to be changed (min 10 chars)")
    .max(500, "Reason too long"),
});

// ─── Product enrichment ────────────────────────────────────────────────────────

const specSchema = z.object({
  key: z.string().min(1, "Spec key required").max(100),
  value: z.string().min(1, "Spec value required").max(500),
});

export const enrichProductSchema = z.object({
  title: z
    .string()
    .min(5, "Title too short")
    .max(200, "Title too long"),

  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens only"),

  description: z
    .string()
    .min(20, "Description too short (min 20 chars)")
    .max(5000, "Description too long"),

  specs: z
    .array(specSchema)
    .min(1, "At least one spec is required")
    .max(30, "Too many specs (max 30)"),

  imageUrls: z
    .array(z.string().regex(/^https:\/\/res\.cloudinary\.com\//, "Invalid Cloudinary image URL"))
    .min(1, "At least one image is required")
    .max(10, "Max 10 images"),

  listingPrice: z.coerce
    .number({ error: "Listing price must be a number" })
    .positive("Listing price must be greater than 0"),
});

export type EnrichProductInput = z.infer<typeof enrichProductSchema>;
export type ProductSpec = z.infer<typeof specSchema>;
