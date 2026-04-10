import { z } from "zod";
import type { CategoryConfig } from "../types";

export const SPARE_PARTS_CONDITIONS = ["NEW", "OEM", "AFTERMARKET", "REFURBISHED"] as const;
export type SparePartsCondition = (typeof SPARE_PARTS_CONDITIONS)[number];

export const SPARE_PART_CATEGORIES = [
  "Display Assembly",
  "Battery",
  "Back Panel / Housing",
  "Camera Module",
  "Charging Port / Flex",
  "Speaker / Earpiece",
  "Motherboard",
  "SIM Tray",
  "Volume / Power Buttons",
  "Front Camera",
  "Rear Camera",
  "Touch Digitizer",
  "Charging IC / PMIC",
  "Other",
] as const;

export const sparePartsConfig: CategoryConfig = {
  id: "SPARE_PARTS",
  slug: "spare-parts",
  label: "Spare Parts",
  description: "Phone components: displays, batteries, camera modules, and more",

  requiredCsvHeaders: ["brand", "model_name", "part_name", "condition", "price", "quantity"],

  csvExampleRow: {
    brand: "Samsung",
    model_name: "Galaxy S23",
    part_name: "Display Assembly",
    part_number: "SAM-S23-DISP",
    category: "Display Assembly",
    condition: "NEW",
    price: "2499",
    quantity: "10",
    description: "Original AMOLED display with frame",
  },

  fields: [
    {
      key: "brand", label: "Brand", type: "text", required: true, csvHeader: "brand",
      validator: z.string().min(1, "Brand is required").max(100),
    },
    {
      key: "model_name", label: "Compatible Model", type: "text", required: true, csvHeader: "model_name",
      validator: z.string().min(1, "Model name is required").max(200),
    },
    {
      key: "part_name", label: "Part Name", type: "text", required: true, csvHeader: "part_name",
      validator: z.string().min(1, "Part name is required").max(200),
    },
    {
      key: "part_number", label: "Part Number / SKU", type: "text", required: false, csvHeader: "part_number",
      validator: z.string().max(100).optional(),
    },
    {
      key: "category", label: "Part Category", type: "select", required: false, csvHeader: "category",
      options: [...SPARE_PART_CATEGORIES],
      validator: z.enum(SPARE_PART_CATEGORIES).optional(),
    },
    {
      key: "condition", label: "Condition", type: "select", required: true, csvHeader: "condition",
      options: [...SPARE_PARTS_CONDITIONS],
      // Zod 4: errorMap → error
      validator: z.enum(SPARE_PARTS_CONDITIONS, {
        error: `Must be one of: ${SPARE_PARTS_CONDITIONS.join(", ")}`,
      }),
    },
    {
      key: "price", label: "Price", type: "number", unit: "₹", required: true, csvHeader: "price",
      csvTransform: (raw) => parseFloat(raw),
      // Zod 4: invalid_type_error → error
      validator: z
        .number({ error: "Price must be a number" })
        .positive("Price must be greater than 0")
        .multipleOf(0.01, "Max 2 decimal places"),
    },
    {
      key: "quantity", label: "Quantity", type: "number", required: true, csvHeader: "quantity",
      csvTransform: (raw) => parseInt(raw, 10),
      validator: z
        .number({ error: "Quantity must be a number" })
        .int("Quantity must be a whole number")
        .min(1, "Minimum quantity is 1")
        .max(99999),
    },
    {
      key: "description", label: "Description", type: "textarea", required: false, csvHeader: "description",
      validator: z.string().max(1000).optional(),
    },
  ],

  crossFieldValidation(row) {
    const errors: { field: string; message: string }[] = [];
    if (row.condition === "OEM" && String(row.model_name ?? "").toLowerCase() === "generic") {
      errors.push({
        field: "model_name",
        message: 'OEM parts must specify a real device model, not "Generic"',
      });
    }
    return errors;
  },
};
