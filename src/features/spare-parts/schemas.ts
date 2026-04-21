import { z } from "zod"

export const PART_CATEGORIES = [
  { value: "DISPLAY",      label: "Display" },
  { value: "BATTERY",      label: "Battery" },
  { value: "CAMERA_REAR",  label: "Rear Camera" },
  { value: "CAMERA_FRONT", label: "Front Camera" },
  { value: "AUDIO",        label: "Audio (Speaker / Mic / Earpiece)" },
  { value: "CHARGING",     label: "Charging & Connectivity" },
  { value: "BODY",         label: "Body Parts (Panel / Frame / Buttons)" },
  { value: "SENSOR",       label: "Sensors (Fingerprint / Proximity)" },
  { value: "INTERNAL",     label: "Internal (Flex Cables / Connectors)" },
  { value: "THERMAL",      label: "Thermal Components" },
  { value: "OTHER",        label: "Other" },
] as const

export const QUALITY_GRADES = [
  { value: "OEM",              label: "OEM" },
  { value: "AFTERMARKET_HIGH", label: "Aftermarket — High Quality" },
  { value: "AFTERMARKET_LOW",  label: "Aftermarket — Standard" },
] as const

export type PartCategoryValue = typeof PART_CATEGORIES[number]["value"]
export type QualityGradeValue = typeof QUALITY_GRADES[number]["value"]

export const sparePartSchema = z
  .object({
    name: z.string().min(2, "Name is required"),
    category: z.enum(["DISPLAY","BATTERY","CAMERA_REAR","CAMERA_FRONT","AUDIO","CHARGING","BODY","SENSOR","INTERNAL","THERMAL","OTHER"], "Select a category"),
    qualityGrade: z.enum(["OEM","AFTERMARKET_HIGH","AFTERMARKET_LOW"], "Select a quality grade"),
    modelIds: z.array(z.string()).min(1, "Select at least one compatible model"),
    price: z.coerce.number().positive("Price must be positive"),
    discountedPrice: z.coerce.number().positive("Discounted price must be positive"),
    quantity: z.coerce.number().int().positive("Quantity must be at least 1"),
    isGenericColor: z.boolean(),
    colors: z.array(z.string()),
    warrantyDays: z.coerce.number().int().min(0).optional(),
    specs: z
      .array(z.object({ key: z.string().min(1), value: z.string().min(1) }))
      .optional()
      .default([]),
    productDetails: z.string().optional(),
    highlights: z.array(z.string().min(1)).optional().default([]),
  })
  .refine((d) => d.discountedPrice <= d.price, {
    message: "Discounted price must be ≤ regular price",
    path: ["discountedPrice"],
  })
  .refine((d) => d.isGenericColor || d.colors.length > 0, {
    message: "Add at least one color or mark as Generic",
    path: ["colors"],
  })

export type SparePartInput = z.infer<typeof sparePartSchema>

export const adminUpdateSparePartSchema = z.object({
  name: z.string().min(2, "Name is required"),
  category: z.enum(["DISPLAY","BATTERY","CAMERA_REAR","CAMERA_FRONT","AUDIO","CHARGING","BODY","SENSOR","INTERNAL","THERMAL","OTHER"]),
  qualityGrade: z.enum(["OEM","AFTERMARKET_HIGH","AFTERMARKET_LOW"]),
  modelIds: z.array(z.string()).min(1, "Select at least one model"),
  price: z.number().positive("Price must be positive"),
  discountedPrice: z.number().positive("Discounted price must be positive"),
  quantity: z.number().int().positive("Quantity required"),
  isGenericColor: z.boolean(),
  colors: z.array(z.string()),
  warrantyDays: z.number().int().min(0).optional(),
  returnDays: z.number().int().min(0).optional(),
  weightGrams: z.number().int().min(0).optional(),
  specs: z.array(z.object({ key: z.string().min(1), value: z.string().min(1) })),
  shortDescription: z.string().max(300).optional(),
  productDetails: z.string().optional(),
  highlights: z.array(z.string().min(1)),
  includesItems: z.array(z.string().min(1)),
  tags: z.array(z.string().min(1)),
  slug: z.string().optional(),
  adminNotes: z.string().optional(),
  status: z.enum(["DRAFT", "PENDING_REVIEW", "ACTIVE", "REJECTED"]),
})

export type AdminUpdateSparePartInput = z.infer<typeof adminUpdateSparePartSchema>
