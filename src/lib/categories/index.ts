/**
 * Category Config Registry
 *
 * Single lookup point for all category configs.
 * Adding a new category = create config file + add one entry here.
 * Nothing else changes.
 */

import { sparePartsConfig } from "./config/spare-parts";
import { vrpConfig } from "./config/vrp";
import { newPhonesConfig } from "./config/new-phones";
import { prexoConfig } from "./config/prexo";
import { openBoxConfig } from "./config/open-box";
import type { CategoryConfig } from "./types";

// ─── Registry ─────────────────────────────────────────────────────────────────

/** Keyed by URL slug — matches [category] in /categories/[category] */
export const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  "spare-parts": sparePartsConfig,
  "vrp":         vrpConfig,
  "new-phones":  newPhonesConfig,
  "prexo":       prexoConfig,
  "open-box":    openBoxConfig,
};

/** Keyed by Prisma enum value — for server actions that receive Category enum */
export const CATEGORY_CONFIGS_BY_ENUM: Record<string, CategoryConfig> = {
  SPARE_PARTS: sparePartsConfig,
  VRP:         vrpConfig,
  NEW_PHONES:  newPhonesConfig,
  PREXO:       prexoConfig,
  OPEN_BOX:    openBoxConfig,
};

// ─── Lookup functions ─────────────────────────────────────────────────────────

/**
 * Get config by URL slug. Used in dynamic page: /categories/[category]
 * Returns null for unknown slugs — caller should 404.
 */
export function getCategoryConfig(slug: string): CategoryConfig | null {
  return CATEGORY_CONFIGS[slug] ?? null;
}

/**
 * Get config by Prisma Category enum value.
 * Used in server actions / API routes that receive the enum directly.
 */
export function getCategoryConfigByEnum(enumValue: string): CategoryConfig | null {
  return CATEGORY_CONFIGS_BY_ENUM[enumValue] ?? null;
}

/**
 * All valid category slugs — used for generateStaticParams() and nav.
 */
export const ALL_CATEGORY_SLUGS = Object.keys(CATEGORY_CONFIGS) as Array<
  CategoryConfig["slug"]
>;

/** Maps URL slug → Prisma CategoryType enum string */
export const SLUG_TO_CATEGORY_TYPE: Record<string, string> = {
  "spare-parts": "SPARE_PARTS",
  "vrp":         "VRP",
  "new-phones":  "NEW_PHONES",
  "prexo":       "PREXO",
  "open-box":    "OPEN_BOX",
};

/** Maps Prisma CategoryType enum string → URL slug */
export const CATEGORY_TYPE_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(SLUG_TO_CATEGORY_TYPE).map(([slug, type]) => [type, slug])
);

// Re-export types and utilities so consumers import from one place
export type { CategoryConfig, FieldDef, CsvRowResult, CsvParseResult, ClientCategoryConfig, ClientFieldDef } from "./types";
export { toClientConfig } from "./types";
export { buildSpecsSchema, validateSpecsRow, mapAndValidateCsvRow } from "./schema-builder";
export { parseCsvFile, generateCsvTemplate, generateErrorCsv, chunkArray, DB_CHUNK_SIZE, MAX_ROWS_PER_UPLOAD } from "./csv-parser";
