import { z } from "zod";
import type { CategoryConfig } from "../types";

const VRP_GRADES = ["GRADE_A", "GRADE_B", "GRADE_C"] as const;
const VRP_STORAGE = ["16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB"] as const;
const VRP_RAM = ["1GB", "2GB", "3GB", "4GB", "6GB", "8GB", "12GB", "16GB"] as const;

export const vrpConfig: CategoryConfig = {
  id: "VRP",
  slug: "vrp",
  label: "VRP (Value Refurbished Phones)",
  description: "Refurbished handsets graded A / B / C by cosmetic and functional condition",

  requiredCsvHeaders: ["brand", "model_name", "storage", "ram", "color", "grade", "price", "quantity"],

  csvExampleRow: {
    brand: "Apple", model_name: "iPhone 13", storage: "128GB", ram: "4GB",
    color: "Midnight", grade: "GRADE_A", price: "28999", quantity: "5",
    imei: "", warranty_months: "6", accessories_included: "Charger|Cable",
  },

  fields: [
    { key: "brand",      label: "Brand",   type: "text",   required: true,  csvHeader: "brand",      validator: z.string().min(1).max(100) },
    { key: "model_name", label: "Model",   type: "text",   required: true,  csvHeader: "model_name", validator: z.string().min(1).max(200) },
    {
      key: "storage", label: "Storage", type: "select", required: true, csvHeader: "storage",
      options: [...VRP_STORAGE],
      validator: z.enum(VRP_STORAGE, { error: `Must be one of: ${VRP_STORAGE.join(", ")}` }),
    },
    {
      key: "ram", label: "RAM", type: "select", required: true, csvHeader: "ram",
      options: [...VRP_RAM],
      validator: z.enum(VRP_RAM, { error: `Must be one of: ${VRP_RAM.join(", ")}` }),
    },
    { key: "color", label: "Color", type: "text", required: true, csvHeader: "color", validator: z.string().min(1).max(60) },
    {
      key: "grade", label: "Grade", type: "select", required: true, csvHeader: "grade",
      options: [...VRP_GRADES],
      validator: z.enum(VRP_GRADES, { error: "Grade must be GRADE_A, GRADE_B, or GRADE_C" }),
    },
    {
      key: "price", label: "Price", type: "number", unit: "₹", required: true, csvHeader: "price",
      csvTransform: (r) => parseFloat(r),
      validator: z.number({ error: "Price must be a number" }).positive(),
    },
    {
      key: "quantity", label: "Quantity", type: "number", required: true, csvHeader: "quantity",
      csvTransform: (r) => parseInt(r, 10),
      validator: z.number().int().min(1).max(99999),
    },
    {
      key: "imei", label: "IMEI", type: "text", required: false, csvHeader: "imei",
      validator: z.string().regex(/^\d{15}$/, "IMEI must be 15 digits").optional().or(z.literal("")),
    },
    {
      key: "warranty_months", label: "Warranty (months)", type: "number", required: false, csvHeader: "warranty_months",
      csvTransform: (r) => r === "" ? undefined : parseInt(r, 10),
      validator: z.number().int().min(0).max(24).optional(),
    },
    {
      key: "accessories_included", label: "Accessories Included", type: "multiselect", required: false, csvHeader: "accessories_included",
      options: ["Charger", "Cable", "Earphones", "Box", "Manual"],
      csvTransform: (r) => r === "" ? [] : r.split("|").map((v) => v.trim()),
      validator: z.array(z.string()).optional(),
    },
  ],

  crossFieldValidation(row) {
    if (row.grade === "GRADE_A" && (row.warranty_months === undefined || Number(row.warranty_months) < 3)) {
      return [{ field: "warranty_months", message: "Grade A phones must have at least 3 months warranty" }];
    }
    return [];
  },
};
