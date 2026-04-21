// Server-only: cheerio-based page parsers per source site.
// Do NOT import this file from client components.

import * as cheerio from "cheerio";
import type { ScrapedProduct } from "./types";

// ─── GSMarena ─────────────────────────────────────────────────────────────────
// Best structured source for phone specs.
// e.g. https://www.gsmarena.com/apple_iphone_11-9818.php

export function scrapeGSMarena(html: string, url: string): ScrapedProduct {
  const $ = cheerio.load(html);

  const title = $("h1.specs-phone-name-title").text().trim() || null;
  const parts  = title?.split(" ") ?? [];
  const brand  = parts[0] ?? null;
  const model  = parts.slice(1).join(" ") || null;

  // Main image
  const images: string[] = [];
  $(".specs-photo-main img").each((_, el) => {
    const src = $(el).attr("src");
    if (src) images.push(src.startsWith("//") ? `https:${src}` : src);
  });

  // Specs table — each <th> is a section, each <tr> is a key/value row
  const specs: { key: string; value: string }[] = [];
  let section = "";
  $("#specs-list table").each((_, tbl) => {
    $(tbl).find("th").each((_, th) => { section = $(th).text().trim(); });
    $(tbl).find("tr").each((_, tr) => {
      const key   = $(tr).find("td.ttl").text().trim();
      const value = $(tr).find("td.nfo").text().trim().replace(/\s+/g, " ");
      if (key && value) specs.push({ key: section ? `${section} › ${key}` : key, value });
    });
  });

  // Highlights — "key features" section if present, else first 4 specs
  const highlights: string[] = specs.slice(0, 4).map((s) => `${s.key}: ${s.value}`);

  const description =
    $("meta[name='description']").attr("content") ??
    $("meta[property='og:description']").attr("content") ??
    null;

  return { source: "gsmarena", title, brand, model, description, highlights, specs, images, rawUrl: url };
}

// ─── Flipkart ─────────────────────────────────────────────────────────────────

export function scrapeFlipkart(html: string, url: string): ScrapedProduct {
  const $ = cheerio.load(html);

  const title =
    $("span.VU-ZEz").first().text().trim() ||
    $("h1").first().text().trim() ||
    null;

  const images: string[] = [];
  $("img.DByuf4, img._396cs4").each((_, el) => {
    const src = $(el).attr("src");
    if (src && src.startsWith("http") && !images.includes(src)) images.push(src);
  });

  const highlights: string[] = [];
  $("._2cM9lP li, ._21lJbe li, .X3BRps li").each((_, el) => {
    const txt = $(el).text().trim();
    if (txt && highlights.length < 6) highlights.push(txt);
  });

  const specs: { key: string; value: string }[] = [];
  $("._14cfVK tr, table.wENmp8 tr").each((_, tr) => {
    const key   = $(tr).find("td:first-child").text().trim();
    const value = $(tr).find("td:last-child").text().trim();
    if (key && value && key !== value) specs.push({ key, value });
  });

  const description =
    $("._1mXcCf").text().trim() ||
    $(".RmoJze").text().trim() ||
    null;

  return { source: "flipkart", title, brand: null, model: null, description, highlights, specs, images, rawUrl: url };
}

// ─── Amazon ───────────────────────────────────────────────────────────────────

export function scrapeAmazon(html: string, url: string): ScrapedProduct {
  const $ = cheerio.load(html);

  const title = $("#productTitle").text().trim() || null;

  const images: string[] = [];
  const mainImg = $("#landingImage").attr("data-old-hires") || $("#landingImage").attr("src");
  if (mainImg) images.push(mainImg);

  const highlights: string[] = [];
  $("#feature-bullets ul li span.a-list-item").each((_, el) => {
    const txt = $(el).text().trim();
    if (txt && !txt.toLowerCase().includes("make sure") && highlights.length < 6)
      highlights.push(txt);
  });

  const specs: { key: string; value: string }[] = [];
  $(
    "table#productDetails_techSpec_section_1 tr, table.a-normal.a-striped tr, #prodDetails table tr"
  ).each((_, tr) => {
    const key   = $(tr).find("th, td:first-child").text().trim().replace(/\s+/g, " ");
    const value = $(tr).find("td:last-child").text().trim().replace(/\s+/g, " ");
    if (key && value && key !== value) specs.push({ key, value });
  });

  const description = $("#productDescription p").text().trim() || null;

  return { source: "amazon", title, brand: null, model: null, description, highlights, specs, images, rawUrl: url };
}

// ─── 91mobiles ────────────────────────────────────────────────────────────────

export function scrape91Mobiles(html: string, url: string): ScrapedProduct {
  const $ = cheerio.load(html);

  const title = $("h1.phone-name, h1").first().text().trim() || null;

  const images: string[] = [];
  $(".phone-big-img img, .gallery-img img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (src && src.startsWith("http")) images.push(src);
  });

  const specs: { key: string; value: string }[] = [];
  $(".specs-table tr, .spec-row").each((_, tr) => {
    const key   = $(tr).find("td:first-child, .spec-title").text().trim();
    const value = $(tr).find("td:last-child, .spec-value").text().trim();
    if (key && value && key !== value) specs.push({ key, value });
  });

  const highlights: string[] = specs.slice(0, 4).map((s) => `${s.key}: ${s.value}`);
  const description = $("meta[name='description']").attr("content") || null;

  return { source: "91mobiles", title, brand: null, model: null, description, highlights, specs, images, rawUrl: url };
}

// ─── Generic fallback (JSON-LD → Open Graph → bare HTML) ─────────────────────

export function scrapeGeneric(html: string, url: string): ScrapedProduct {
  const $ = cheerio.load(html);

  // 1. Try JSON-LD Product schema
  let jsonLd: Record<string, unknown> | null = null;
  $("script[type='application/ld+json']").each((_, el) => {
    if (jsonLd) return;
    try {
      const raw = JSON.parse($(el).html() ?? "{}");
      const items: unknown[] = Array.isArray(raw) ? raw : [raw];
      const prod = items.find((i): i is Record<string, unknown> =>
        typeof i === "object" && i !== null && (i as Record<string, unknown>)["@type"] === "Product"
      );
      if (prod) jsonLd = prod;
    } catch { /* ignore */ }
  });

  if (jsonLd) {
    const specs: { key: string; value: string }[] = [];
    const additionalProps = jsonLd["additionalProperty"];
    if (Array.isArray(additionalProps)) {
      for (const p of additionalProps as Record<string, unknown>[]) {
        if (p.name && p.value) specs.push({ key: String(p.name), value: String(p.value) });
      }
    }

    const images: string[] = [];
    const rawImgs = jsonLd["image"];
    const imgArr: unknown[] = Array.isArray(rawImgs) ? rawImgs : rawImgs ? [rawImgs] : [];
    for (const img of imgArr) {
      const src = typeof img === "string" ? img : (img as Record<string, unknown>)?.url as string;
      if (src) images.push(src);
    }

    const brandObj = jsonLd["brand"] as Record<string, unknown> | undefined;

    return {
      source:      "json-ld",
      title:       (jsonLd["name"] as string) ?? null,
      brand:       (brandObj?.name as string) ?? null,
      model:       (jsonLd["model"] as string) ?? null,
      description: (jsonLd["description"] as string) ?? null,
      highlights:  [],
      specs,
      images,
      rawUrl: url,
    };
  }

  // 2. Open Graph / meta fallback
  const title =
    $("meta[property='og:title']").attr("content") ??
    $("title").text().trim() ??
    null;
  const description =
    $("meta[property='og:description']").attr("content") ??
    $("meta[name='description']").attr("content") ??
    null;
  const ogImg = $("meta[property='og:image']").attr("content");

  return {
    source:      "generic",
    title,
    brand:       null,
    model:       null,
    description,
    highlights:  [],
    specs:       [],
    images:      ogImg ? [ogImg] : [],
    rawUrl:      url,
  };
}

// ─── Site detector ────────────────────────────────────────────────────────────

export function detectSite(url: string): string {
  if (url.includes("gsmarena.com"))  return "gsmarena";
  if (url.includes("flipkart.com"))  return "flipkart";
  if (url.includes("amazon.in") || url.includes("amazon.com")) return "amazon";
  if (url.includes("91mobiles.com")) return "91mobiles";
  return "generic";
}

// ─── Main dispatcher ──────────────────────────────────────────────────────────

export function parsePage(html: string, url: string): ScrapedProduct {
  switch (detectSite(url)) {
    case "gsmarena":   return scrapeGSMarena(html, url);
    case "flipkart":   return scrapeFlipkart(html, url);
    case "amazon":     return scrapeAmazon(html, url);
    case "91mobiles":  return scrape91Mobiles(html, url);
    default:           return scrapeGeneric(html, url);
  }
}
