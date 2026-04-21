import { z } from "zod";
import type { CategoryConfig } from "../types";

const PREXO_GRADES = ["A", "B", "C", "D"] as const;
const STORAGE = ["16GB", "32GB", "64GB", "128GB", "256GB", "512GB"] as const;
const RAM = ["1GB", "2GB", "3GB", "4GB", "6GB", "8GB", "12GB"] as const;

export const prexoConfig: CategoryConfig = {
  id: "PREXO",
  slug: "prexo",
  label: "PREXO (Pre-Owned Exchange)",
  description: "Exchange-assessed pre-owned phones graded A–D",

  requiredCsvHeaders: ["brand", "model_name", "storage", "ram", "color", "grade", "exchange_price", "seller_price", "quantity"],

  csvExampleRow: {
    brand: "Xiaomi", model_name: "Redmi Note 12", storage: "128GB", ram: "6GB",
    color: "Onyx Black", grade: "B", exchange_price: "4500", seller_price: "7999",
    quantity: "3", issues_noted: "Minor screen scratches|Battery health 85%",
  },

  fields: [
    { key: "brand",          label: "Brand",            type: "text",        required: true,  csvHeader: "brand",          validator: z.string().min(1).max(100) },
    { key: "model_name",     label: "Model",            type: "text",        required: true,  csvHeader: "model_name",     validator: z.string().min(1).max(200) },
    { key: "storage",        label: "Storage",          type: "select",      required: true,  csvHeader: "storage",        options: [...STORAGE], validator: z.enum(STORAGE) },
    { key: "ram",            label: "RAM",              type: "select",      required: true,  csvHeader: "ram",            options: [...RAM],     validator: z.enum(RAM) },
    { key: "color",          label: "Color",            type: "text",        required: true,  csvHeader: "color",          validator: z.string().min(1).max(60) },
    {
      key: "grade", label: "Assessment Grade", type: "select", required: true, csvHeader: "grade",
      options: [...PREXO_GRADES],
      validator: z.enum(PREXO_GRADES, { error: "Grade must be A, B, C, or D" }),
    },
    {
      key: "exchange_price", label: "Exchange Price",   type: "number", unit: "₹", required: true, csvHeader: "exchange_price",
      csvTransform: (r) => parseFloat(r),
      validator: z.number().positive("Exchange price must be positive"),
    },
    {
      key: "seller_price",   label: "Seller Ask Price", type: "number", unit: "₹", required: true, csvHeader: "seller_price",
      csvTransform: (r) => parseFloat(r),
      validator: z.number().positive("Seller price must be positive"),
    },
    {
      key: "quantity", label: "Quantity", type: "number", required: true, csvHeader: "quantity",
      csvTransform: (r) => parseInt(r, 10),
      validator: z.number().int().min(1).max(99999),
    },
    {
      key: "issues_noted", label: "Issues Noted", type: "multiselect", required: false, csvHeader: "issues_noted",
      options: ["Screen scratches", "Body dents", "Battery health <80%", "Camera issue", "Speaker issue", "Button issue", "Non-working"],
      csvTransform: (r) => r === "" ? [] : r.split("|").map((v) => v.trim()),
      validator: z.array(z.string()).optional(),
    },
  ],

  crossFieldValidation(row) {
    const errors: { field: string; message: string }[] = [];
    if (row.grade === "D" && Number(row.seller_price) > 999) {
      errors.push({ field: "seller_price", message: "Grade D devices cannot be priced above ₹999 (scrap value)" });
    }
    if (Number(row.seller_price) < Number(row.exchange_price)) {
      errors.push({ field: "seller_price", message: "Seller price must be greater than or equal to exchange price" });
    }
    return errors;
  },
};
