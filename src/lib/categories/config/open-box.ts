import { z } from "zod";
import type { CategoryConfig } from "../types";

const BOX_CONDITIONS = ["SEALED", "OPENED_INTACT", "BOX_DAMAGED"] as const;
const STORAGE = ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB"] as const;
const RAM = ["2GB", "3GB", "4GB", "6GB", "8GB", "12GB", "16GB"] as const;

export const openBoxConfig: CategoryConfig = {
  id: "OPEN_BOX",
  slug: "open-box",
  label: "Open Box",
  description: "Opened but unused phones — display units, cancelled orders, gift returns",

  requiredCsvHeaders: ["brand", "model_name", "storage", "ram", "color", "box_condition", "price", "quantity"],

  csvExampleRow: {
    brand: "OnePlus", model_name: "12", storage: "256GB", ram: "12GB",
    color: "Silky Black", box_condition: "OPENED_INTACT", price: "57999",
    quantity: "2", accessories_missing: "Earphones", warranty_months: "11",
  },

  fields: [
    { key: "brand",               label: "Brand",                       type: "text",        required: true,  csvHeader: "brand",               validator: z.string().min(1).max(100) },
    { key: "model_name",          label: "Model",                       type: "text",        required: true,  csvHeader: "model_name",          validator: z.string().min(1).max(200) },
    { key: "storage",             label: "Storage",                     type: "select",      required: true,  csvHeader: "storage",             options: [...STORAGE], validator: z.enum(STORAGE) },
    { key: "ram",                 label: "RAM",                         type: "select",      required: true,  csvHeader: "ram",                 options: [...RAM],     validator: z.enum(RAM) },
    { key: "color",               label: "Color",                       type: "text",        required: true,  csvHeader: "color",               validator: z.string().min(1).max(60) },
    {
      key: "box_condition", label: "Box Condition", type: "select", required: true, csvHeader: "box_condition",
      options: [...BOX_CONDITIONS],
      validator: z.enum(BOX_CONDITIONS, { error: "Must be SEALED, OPENED_INTACT, or BOX_DAMAGED" }),
    },
    {
      key: "price", label: "Price", type: "number", unit: "₹", required: true, csvHeader: "price",
      csvTransform: (r) => parseFloat(r),
      validator: z.number().positive(),
    },
    {
      key: "quantity", label: "Quantity", type: "number", required: true, csvHeader: "quantity",
      csvTransform: (r) => parseInt(r, 10),
      validator: z.number().int().min(1).max(99999),
    },
    {
      key: "accessories_missing", label: "Accessories Missing", type: "multiselect", required: false, csvHeader: "accessories_missing",
      options: ["Charger", "Cable", "Earphones", "Box", "Manual", "SIM Tool"],
      csvTransform: (r) => r === "" ? [] : r.split("|").map((v) => v.trim()),
      validator: z.array(z.string()).optional(),
    },
    {
      key: "warranty_months", label: "Remaining Warranty (months)", type: "number", required: false, csvHeader: "warranty_months",
      csvTransform: (r) => r === "" ? undefined : parseInt(r, 10),
      validator: z.number().int().min(0).max(24).optional(),
    },
  ],

  crossFieldValidation(row) {
    const errors: { field: string; message: string }[] = [];
    const missing = Array.isArray(row.accessories_missing) ? row.accessories_missing : [];
    if (row.box_condition === "SEALED" && missing.length > 0) {
      errors.push({ field: "accessories_missing", message: "SEALED box cannot have missing accessories" });
    }
    return errors;
  },
};
