// Shared types for the web-scrape feature.
// Safe to import from both server (API route) and client (EnrichForm matcher).

export interface ScrapedProduct {
  source:      string;                        // "gsmarena" | "flipkart" | "amazon" | "json-ld" | "generic"
  title:       string | null;
  brand:       string | null;
  model:       string | null;
  description: string | null;
  highlights:  string[];
  specs:       { key: string; value: string }[];
  images:      string[];
  rawUrl:      string;
}

export interface SellerSnapshot {
  brand:     string;
  modelName: string;
  partName:  string | null;
  specs:     Record<string, unknown> | null;  // raw specs JSON from seller draft
}

export interface MatchResult {
  score:        number;   // 0–100
  brandMatch:   boolean;
  modelMatch:   boolean;
  storageMatch: boolean;
  ramMatch:     boolean;
  details:      string[]; // human-readable match points
}

export interface ApplyFields {
  title:       boolean;
  description: boolean;
  highlights:  boolean;
  specs:       boolean;
  images:      boolean;
}
