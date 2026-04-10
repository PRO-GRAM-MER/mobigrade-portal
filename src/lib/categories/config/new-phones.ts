import { z } from "zod";
import type { CategoryConfig } from "../types";

/**
 * NEW PHONES — sealed box, brand new
 *
 * Required: brand, model_name, storage, ram, color, warranty_months, price, quantity
 * Optional: imei, variant_notes
 *
 * Cross-field: warranty_months must be >= 12 for new phones
 */

const STORAGE = ["16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB"] as const;
const RAM = ["1GB", "2GB", "3GB", "4GB", "6GB", "8GB", "12GB", "16GB"] as const;

export const newPhonesConfig: CategoryConfig = {
  id: "NEW_PHONES",
  slug: "new-phones",
  label: "New Phones",
  description: "Brand new, sealed box smartphones with full manufacturer warranty",

  requiredCsvHeaders: ["brand", "model_name", "storage", "ram", "color", "warranty_months", "price", "quantity"],

  csvExampleRow: {
    brand: "Samsung",
    model_name: "Galaxy A55",
    storage: "256GB",
    ram: "8GB",
    color: "Awesome Navy",
    warranty_months: "12",
    price: "32999",
    quantity: "20",
    imei: "",
    variant_notes: "Dual SIM",
  },

  fields: [
    { key: "brand",            label: "Brand",             type: "text",   required: true,  csvHeader: "brand",            validator: z.string().min(1).max(100) },
    { key: "model_name",       label: "Model",             type: "text",   required: true,  csvHeader: "model_name",       validator: z.string().min(1).max(200) },
    { key: "storage",          label: "Storage",           type: "select", required: true,  csvHeader: "storage",          options: [...STORAGE], validator: z.enum(STORAGE) },
    { key: "ram",              label: "RAM",               type: "select", required: true,  csvHeader: "ram",              options: [...RAM],     validator: z.enum(RAM) },
    { key: "color",            label: "Color",             type: "text",   required: true,  csvHeader: "color",            validator: z.string().min(1).max(60) },
    {
      key: "warranty_months",  label: "Warranty (months)", type: "number", required: true,  csvHeader: "warranty_months",
      csvTransform: (r) => parseInt(r, 10),
      validator: z.number().int().min(1).max(24),
    },
    {
      key: "price",            label: "Price",             type: "number", unit: "₹", required: true, csvHeader: "price",
      csvTransform: (r) => parseFloat(r),
      validator: z.number().positive(),
    },
    {
      key: "quantity",         label: "Quantity",          type: "number", required: true,  csvHeader: "quantity",
      csvTransform: (r) => parseInt(r, 10),
      validator: z.number().int().min(1).max(99999),
    },
    { key: "imei",             label: "IMEI",              type: "text",   required: false, csvHeader: "imei",             validator: z.string().regex(/^\d{15}$/).optional().or(z.literal("")) },
    { key: "variant_notes",    label: "Variant Notes",     type: "text",   required: false, csvHeader: "variant_notes",    validator: z.string().max(200).optional() },
  ],

  crossFieldValidation(row) {
    if (Number(row.warranty_months) < 12) {
      return [{ field: "warranty_months", message: "New phones must have at least 12 months warranty" }];
    }
    return [];
  },
};
