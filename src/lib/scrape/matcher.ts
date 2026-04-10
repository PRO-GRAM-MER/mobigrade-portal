// Client-safe: pure string matching, no server imports.

import type { ScrapedProduct, SellerSnapshot, MatchResult } from "./types";

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function fuzzyIncludes(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  return na.includes(nb) || nb.includes(na);
}

function findSpecValue(specs: { key: string; value: string }[], ...keywords: string[]): string {
  for (const { key, value } of specs) {
    const nk = normalize(key);
    if (keywords.some((kw) => nk.includes(normalize(kw)))) return value;
  }
  return "";
}

export function matchProduct(scraped: ScrapedProduct, seller: SellerSnapshot): MatchResult {
  const details: string[] = [];

  // ── Brand (40 pts) ────────────────────────────────────────────────────────
  const scrapedBrand = scraped.brand ?? scraped.title ?? "";
  const brandMatch   = fuzzyIncludes(scrapedBrand, seller.brand);
  if (brandMatch) details.push(`Brand matched: "${seller.brand}"`);

  // ── Model (40 pts) ────────────────────────────────────────────────────────
  const scrapedModel = [scraped.model, scraped.title].filter(Boolean).join(" ");
  const modelMatch   = fuzzyIncludes(scrapedModel, seller.modelName);
  if (modelMatch) details.push(`Model matched: "${seller.modelName}"`);

  // ── Storage (10 pts) ──────────────────────────────────────────────────────
  const sellerStorage  = String(seller.specs?.storage ?? seller.specs?.Storage ?? "");
  const scrapedStorage = findSpecValue(scraped.specs, "storage", "internal storage", "memory");
  const storageMatch   = sellerStorage !== "" && fuzzyIncludes(scrapedStorage, sellerStorage);
  if (storageMatch) details.push(`Storage matched: "${sellerStorage}"`);

  // ── RAM (5 pts) ───────────────────────────────────────────────────────────
  const sellerRam  = String(seller.specs?.ram ?? seller.specs?.RAM ?? "");
  const scrapedRam = findSpecValue(scraped.specs, "ram", "memory");
  const ramMatch   = sellerRam !== "" && fuzzyIncludes(scrapedRam, sellerRam);
  if (ramMatch) details.push(`RAM matched: "${sellerRam}"`);

  // ── Part name for spare parts (5 pts) ────────────────────────────────────
  const partMatch =
    seller.partName != null &&
    fuzzyIncludes(scraped.title ?? "", seller.partName);
  if (partMatch && seller.partName) details.push(`Part matched: "${seller.partName}"`);

  const score =
    (brandMatch   ? 40 : 0) +
    (modelMatch   ? 40 : 0) +
    (storageMatch ? 10 : 0) +
    (ramMatch     ?  5 : 0) +
    (partMatch    ?  5 : 0);

  if (details.length === 0) details.push("No matching fields found");

  return { score, brandMatch, modelMatch, storageMatch, ramMatch, details };
}
