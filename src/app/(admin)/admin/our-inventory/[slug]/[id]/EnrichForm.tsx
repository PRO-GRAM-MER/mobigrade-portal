"use client";

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import {
  Plus, Trash2, Loader2, CheckCircle2, AlertCircle,
  Globe, GlobeLock, Search, ChevronDown, ChevronUp,
  CheckSquare, Square, RefreshCw,
} from "lucide-react";
import { enrichSellerProductAction, toggleLiveProductPublishAction, type EnrichData } from "@/actions/inventory-actions";
import { matchProduct }   from "@/lib/scrape/matcher";
import type { ScrapedProduct, MatchResult, ApplyFields } from "@/lib/scrape/types";
import s from "../../../admin.module.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(str: string) {
  return str.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-").replace(/-+/g, "-");
}

function scoreColor(n: number) {
  if (n >= 80) return "#00A167";
  if (n >= 50) return "#F59E0B";
  return "#D92D20";
}

function scoreLabel(n: number) {
  if (n >= 80) return "Strong match";
  if (n >= 50) return "Partial match";
  return "Weak match — verify manually";
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveProduct {
  id:           string;
  title:        string;
  slug:         string;
  description:  string;
  highlights:   string[];
  listingPrice: number;
  imageUrls:    string[];
  specs:        { key: string; value: string }[];
  status:       string;
}

interface Props {
  sellerProductId: string;
  slug:            string;
  sellerBrand:     string;
  sellerModel:     string;
  sellerPartName:  string | null;
  sellerPrice:     number;
  sellerImages:    string[];
  sellerDesc:      string | null;
  sellerSpecs:     Record<string, unknown> | null;
  productName:     string;
  liveProduct:     LiveProduct | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EnrichForm({
  sellerProductId, slug,
  sellerBrand, sellerModel, sellerPartName,
  sellerPrice, sellerImages, sellerDesc, sellerSpecs,
  productName, liveProduct,
}: Props) {
  const router                       = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast,     setToast]        = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [mode,      setMode]         = useState<"view" | "edit">(liveProduct ? "view" : "edit");

  // ── Form state ─────────────────────────────────────────────────────────────

  const seedSpecs = sellerSpecs
    ? Object.entries(sellerSpecs)
        .filter(([, v]) => v != null && v !== "")
        .map(([k, v]) => ({
          key:   k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          value: Array.isArray(v) ? (v as string[]).join(", ") : String(v),
        }))
    : [];

  const [title,        setTitle]        = useState(liveProduct?.title        ?? productName);
  const [urlSlug,      setUrlSlug]      = useState(liveProduct?.slug         ?? slugify(productName));
  const [description,  setDescription]  = useState(liveProduct?.description  ?? sellerDesc ?? "");
  const [highlights,   setHighlights]   = useState<string[]>(liveProduct?.highlights?.length ? liveProduct.highlights : ["", "", ""]);
  const [listingPrice, setListingPrice] = useState<number>(liveProduct?.listingPrice ?? sellerPrice);
  const [imageUrls,    setImageUrls]    = useState<string[]>(liveProduct?.imageUrls?.length ? liveProduct.imageUrls : sellerImages.length ? sellerImages : [""]);
  const [specs,        setSpecs]        = useState<{ key: string; value: string }[]>(liveProduct?.specs?.length ? liveProduct.specs : seedSpecs.length ? seedSpecs : [{ key: "", value: "" }]);

  // ── Scrape state ───────────────────────────────────────────────────────────

  const [scrapeOpen,    setScrapeOpen]    = useState(false);
  const [scrapeUrl,     setScrapeUrl]     = useState("");
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeError,   setScrapeError]   = useState<string | null>(null);
  const [scraped,       setScraped]       = useState<ScrapedProduct | null>(null);
  const [matchResult,   setMatchResult]   = useState<MatchResult | null>(null);
  const [applyFields,   setApplyFields]   = useState<ApplyFields>({
    title: true, description: true, highlights: true, specs: true, images: true,
  });

  // ── Scrape handlers ────────────────────────────────────────────────────────

  async function handleScrape() {
    if (!scrapeUrl.trim()) return;
    setScrapeLoading(true);
    setScrapeError(null);
    setScraped(null);
    setMatchResult(null);

    try {
      const res  = await fetch("/api/admin/scrape", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url: scrapeUrl.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Scrape failed");

      const result = matchProduct(data.data, {
        brand:     sellerBrand,
        modelName: sellerModel,
        partName:  sellerPartName,
        specs:     sellerSpecs,
      });

      setScraped(data.data);
      setMatchResult(result);

      // Auto-toggle available fields on
      setApplyFields({
        title:       !!data.data.title,
        description: !!data.data.description,
        highlights:  data.data.highlights.length > 0,
        specs:       data.data.specs.length > 0,
        images:      data.data.images.length > 0,
      });
    } catch (e) {
      setScrapeError(e instanceof Error ? e.message : "Scrape failed");
    } finally {
      setScrapeLoading(false);
    }
  }

  function handleApplyScraped() {
    if (!scraped) return;
    if (applyFields.title       && scraped.title)               { setTitle(scraped.title); setUrlSlug(slugify(scraped.title)); }
    if (applyFields.description && scraped.description)         setDescription(scraped.description);
    if (applyFields.highlights  && scraped.highlights.length)   setHighlights(scraped.highlights.slice(0, 6));
    if (applyFields.specs       && scraped.specs.length)        setSpecs(scraped.specs);
    if (applyFields.images      && scraped.images.length)       setImageUrls(scraped.images);
    setScraped(null);
    setMatchResult(null);
    setScrapeOpen(false);
    showToast("success", "Scraped data applied. Review and save when ready.");
  }

  // ── Form helpers ───────────────────────────────────────────────────────────

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  }

  function handleTitleChange(v: string) { setTitle(v); setUrlSlug(slugify(v)); }

  const setHL  = (i: number, v: string) => setHighlights(p => p.map((h, idx) => idx === i ? v : h));
  const addHL  = () => setHighlights(p => [...p, ""]);
  const rmHL   = (i: number) => setHighlights(p => p.filter((_, idx) => idx !== i));

  const setImg = (i: number, v: string) => setImageUrls(p => p.map((u, idx) => idx === i ? v : u));
  const addImg = () => setImageUrls(p => [...p, ""]);
  const rmImg  = (i: number) => setImageUrls(p => p.filter((_, idx) => idx !== i));

  const setSpecK = (i: number, v: string) => setSpecs(p => p.map((sp, idx) => idx === i ? { ...sp, key: v }   : sp));
  const setSpecV = (i: number, v: string) => setSpecs(p => p.map((sp, idx) => idx === i ? { ...sp, value: v } : sp));
  const addSpec  = () => setSpecs(p => [...p, { key: "", value: "" }]);
  const rmSpec   = (i: number) => setSpecs(p => p.filter((_, idx) => idx !== i));

  function validate() {
    if (!title.trim())       return "Title is required.";
    if (!urlSlug.trim())     return "Slug is required.";
    if (!description.trim()) return "Description is required.";
    if (highlights.filter(Boolean).length < 2) return "At least 2 highlights are required.";
    if (listingPrice <= 0)   return "Listing price must be greater than 0.";
    return null;
  }

  function buildPayload(): EnrichData {
    return {
      title:        title.trim(),
      slug:         urlSlug.trim(),
      description:  description.trim(),
      highlights:   highlights.filter(Boolean),
      listingPrice,
      imageUrls:    imageUrls.filter(Boolean),
      specs:        specs.filter(sp => sp.key.trim() && sp.value.trim()),
    };
  }

  function handleSave() {
    const err = validate();
    if (err) { showToast("error", err); return; }
    startTransition(async () => {
      const res = await enrichSellerProductAction(sellerProductId, buildPayload());
      if (res.success) {
        showToast("success", liveProduct ? "Listing updated." : "Saved to website inventory as Draft.");
        setMode("view");
        router.refresh();
      } else {
        showToast("error", res.error);
      }
    });
  }

  function handleTogglePublish() {
    if (!liveProduct) return;
    startTransition(async () => {
      const res = await toggleLiveProductPublishAction(liveProduct.id);
      if (res.success) {
        showToast("success", res.data.status === "PUBLISHED" ? "Product published to website!" : "Product unpublished.");
        router.refresh();
      } else {
        showToast("error", res.error);
      }
    });
  }

  const isPublished = liveProduct?.status === "PUBLISHED";

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Toast */}
      {toast && (
        <div
          className={s.alert}
          style={toast.type === "success"
            ? { background: "rgba(0,162,103,0.10)", border: "1px solid rgba(0,162,103,0.25)", color: "#007a50" }
            : { background: "#fee2e2", border: "1px solid #fca5a5", color: "#dc2626" }}
        >
          {toast.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Publish status bar */}
      {liveProduct && mode === "view" && (
        <div className={s.reviewPanel} style={
          isPublished
            ? { background: "rgba(0,162,103,0.04)", border: "1px solid rgba(0,162,103,0.2)" }
            : { background: "rgba(47,53,103,0.03)", border: "1px solid rgba(47,53,103,0.12)" }
        }>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {isPublished ? <Globe size={16} style={{ color: "#007a50" }} /> : <GlobeLock size={16} style={{ color: "var(--color-muted-foreground)" }} />}
              <div>
                <p className={s.reviewPanelTitle} style={{ color: isPublished ? "#007a50" : "var(--color-primary)" }}>
                  {isPublished ? "Published on Website" : "Saved as Draft — Not Yet Published"}
                </p>
                <p style={{ fontSize: "0.78rem", color: "var(--color-muted-foreground)" }}>Slug: /{liveProduct.slug}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className={s.btnGhost} onClick={() => setMode("edit")} style={{ padding: "7px 14px" }}>
                Edit Listing
              </button>
              <button type="button" className={s.btnPrimary} onClick={handleTogglePublish} disabled={isPending}
                style={isPublished ? { background: "#dc2626" } : {}}>
                {isPending ? <Loader2 size={14} className="spin" /> : isPublished ? <GlobeLock size={14} /> : <Globe size={14} />}
                {isPending ? "…" : isPublished ? "Unpublish" : "Publish to Website"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit mode ───────────────────────────────────────────────────────── */}
      {mode === "edit" && (
        <>
          {/* ── Web Scrape Panel ─────────────────────────────────────────── */}
          <div className={s.detailCard} style={{ border: "1px solid var(--color-border)" }}>
            <button
              type="button"
              onClick={() => setScrapeOpen(v => !v)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "12px 16px", background: "none", border: "none",
                cursor: "pointer", gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Search size={15} style={{ color: "var(--color-accent)" }} />
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-primary)" }}>
                  Auto-fill from Web Scrape
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--color-muted-foreground)" }}>
                  — Paste a product URL to fetch title, specs, images &amp; more
                </span>
              </div>
              {scrapeOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {scrapeOpen && (
              <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                {/* URL input */}
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="url"
                    className="input-base"
                    style={{ flex: 1 }}
                    placeholder="https://www.gsmarena.com/…  or  flipkart.com  or  amazon.in  or  91mobiles.com"
                    value={scrapeUrl}
                    onChange={e => setScrapeUrl(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleScrape()}
                  />
                  <button
                    type="button"
                    className={s.btnPrimary}
                    onClick={handleScrape}
                    disabled={scrapeLoading || !scrapeUrl.trim()}
                    style={{ whiteSpace: "nowrap", padding: "0 16px" }}
                  >
                    {scrapeLoading ? <><Loader2 size={13} className="spin" /> Fetching…</> : <><Search size={13} /> Fetch</>}
                  </button>
                </div>

                {/* Supported sites hint */}
                <p style={{ fontSize: "0.72rem", color: "var(--color-muted-foreground)" }}>
                  Supported: <strong>GSMarena</strong> (best for phones) · Flipkart · Amazon.in · 91mobiles · any site with JSON-LD/OpenGraph
                </p>

                {/* Error */}
                {scrapeError && (
                  <div className={s.alert} style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#dc2626" }}>
                    <AlertCircle size={13} /> {scrapeError}
                  </div>
                )}

                {/* Result panel */}
                {scraped && matchResult && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid var(--color-border)", paddingTop: 12 }}>

                    {/* Match score bar */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-primary)" }}>
                          Match Analysis
                        </span>
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: scoreColor(matchResult.score) }}>
                          {matchResult.score}% — {scoreLabel(matchResult.score)}
                        </span>
                      </div>
                      {/* Score bar */}
                      <div style={{ height: 6, borderRadius: 99, background: "var(--color-border)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: `${matchResult.score}%`,
                          background: scoreColor(matchResult.score),
                          transition: "width 0.4s ease",
                          borderRadius: 99,
                        }} />
                      </div>
                      {/* Details */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                        {matchResult.details.map((d, i) => (
                          <span key={i} style={{
                            fontSize: "0.72rem", padding: "2px 8px", borderRadius: 99,
                            background: "rgba(0,161,103,0.08)", color: "#007a50", fontWeight: 500,
                          }}>
                            ✓ {d}
                          </span>
                        ))}
                        {!matchResult.brandMatch && (
                          <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: 99, background: "#FEF2F2", color: "#DC2626", fontWeight: 500 }}>
                            ✗ Brand mismatch
                          </span>
                        )}
                        {!matchResult.modelMatch && (
                          <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: 99, background: "#FEF2F2", color: "#DC2626", fontWeight: 500 }}>
                            ✗ Model mismatch
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Scraped preview */}
                    <div style={{ background: "var(--color-background)", borderRadius: 8, padding: "10px 12px", fontSize: "0.78rem", color: "var(--color-muted)" }}>
                      <strong style={{ color: "var(--color-primary)" }}>Scraped from:</strong> {scraped.source} &nbsp;·&nbsp;
                      <strong style={{ color: "var(--color-primary)" }}>Title:</strong> {scraped.title ?? "—"} &nbsp;·&nbsp;
                      <strong style={{ color: "var(--color-primary)" }}>Specs:</strong> {scraped.specs.length} &nbsp;·&nbsp;
                      <strong style={{ color: "var(--color-primary)" }}>Images:</strong> {scraped.images.length}
                    </div>

                    {/* Field selection */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-primary)" }}>
                        Select fields to apply:
                      </p>
                      {(
                        [
                          { key: "title",       label: "Title",       available: !!scraped.title,              preview: scraped.title ?? "" },
                          { key: "description", label: "Description", available: !!scraped.description,        preview: scraped.description ? scraped.description.slice(0, 80) + (scraped.description.length > 80 ? "…" : "") : "" },
                          { key: "highlights",  label: "Highlights",  available: scraped.highlights.length > 0, preview: `${scraped.highlights.length} bullet point(s)` },
                          { key: "specs",       label: "Specs",       available: scraped.specs.length > 0,      preview: `${scraped.specs.length} spec(s)` },
                          { key: "images",      label: "Images",      available: scraped.images.length > 0,     preview: `${scraped.images.length} image URL(s)` },
                        ] as const
                      ).map(({ key, label, available, preview }) => (
                        <button
                          key={key}
                          type="button"
                          disabled={!available}
                          onClick={() => available && setApplyFields(f => ({ ...f, [key]: !f[key] }))}
                          style={{
                            display: "flex", alignItems: "flex-start", gap: 10,
                            padding: "8px 10px", borderRadius: 6, border: "1px solid var(--color-border)",
                            background: applyFields[key] ? "rgba(47,53,103,0.04)" : "#fff",
                            cursor: available ? "pointer" : "not-allowed",
                            opacity: available ? 1 : 0.4, textAlign: "left",
                          }}
                        >
                          {applyFields[key]
                            ? <CheckSquare size={14} style={{ color: "var(--color-primary)", flexShrink: 0, marginTop: 1 }} />
                            : <Square      size={14} style={{ color: "var(--color-muted-foreground)", flexShrink: 0, marginTop: 1 }} />
                          }
                          <div>
                            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-primary)" }}>{label}</span>
                            {available && (
                              <span style={{ display: "block", fontSize: "0.72rem", color: "var(--color-muted-foreground)", marginTop: 1 }}>
                                {preview}
                              </span>
                            )}
                            {!available && (
                              <span style={{ display: "block", fontSize: "0.72rem", color: "var(--color-muted-foreground)", marginTop: 1 }}>
                                Not found on this page
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Apply button */}
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button type="button" className={s.btnGhost}
                        onClick={() => { setScraped(null); setMatchResult(null); setScrapeUrl(""); }}
                        style={{ padding: "7px 14px" }}
                      >
                        Discard
                      </button>
                      <button
                        type="button"
                        className={s.btnPrimary}
                        onClick={handleApplyScraped}
                        disabled={!Object.values(applyFields).some(Boolean)}
                      >
                        <RefreshCw size={13} />
                        Apply to Form
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Title + Slug ──────────────────────────────────────────────── */}
          <div className={s.detailCard}>
            <div className={s.detailCardHead}><p className={s.detailCardTitle}>Listing Identity</p></div>
            <div className={s.detailCardBody} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Title <span style={{ color: "var(--color-accent)" }}>*</span></label>
                <input type="text" className="input-base" value={title} onChange={e => handleTitleChange(e.target.value)} placeholder="e.g. Apple iPhone 11 OLED Display" />
              </div>
              <div className="form-group">
                <label className="form-label">URL Slug <span style={{ color: "var(--color-accent)" }}>*</span></label>
                <input type="text" className="input-base" value={urlSlug} onChange={e => setUrlSlug(e.target.value)} placeholder="apple-iphone-11-display" />
                <p style={{ fontSize: "0.75rem", color: "var(--color-muted-foreground)", marginTop: 3 }}>/products/{urlSlug || "…"}</p>
              </div>
            </div>
          </div>

          {/* ── Description ───────────────────────────────────────────────── */}
          <div className={s.detailCard}>
            <div className={s.detailCardHead}><p className={s.detailCardTitle}>Description <span style={{ color: "var(--color-accent)" }}>*</span></p></div>
            <div className={s.detailCardBody}>
              <textarea className={s.textarea} rows={5} placeholder="Write a detailed product description for the website…" value={description} onChange={e => setDescription(e.target.value)} style={{ minHeight: 120 }} />
            </div>
          </div>

          {/* ── Highlights ────────────────────────────────────────────────── */}
          <div className={s.detailCard}>
            <div className={s.detailCardHead}><p className={s.detailCardTitle}>Highlights <span style={{ color: "var(--color-muted-foreground)", fontWeight: 400, fontSize: "0.78rem" }}>(2–6 bullet points)</span></p></div>
            <div className={s.detailCardBody} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {highlights.map((h, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="text" className="input-base" style={{ flex: 1 }} placeholder={`Highlight ${i + 1}`} value={h} onChange={e => setHL(i, e.target.value)} />
                  {highlights.length > 1 && (
                    <button type="button" onClick={() => rmHL(i)} style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 4 }}><Trash2 size={14} /></button>
                  )}
                </div>
              ))}
              {highlights.length < 6 && (
                <button type="button" onClick={addHL} className={s.btnGhost} style={{ alignSelf: "flex-start", padding: "5px 12px" }}><Plus size={13} /> Add Highlight</button>
              )}
            </div>
          </div>

          {/* ── Price ────────────────────────────────────────────────────── */}
          <div className={s.detailCard}>
            <div className={s.detailCardHead}><p className={s.detailCardTitle}>Listing Price</p></div>
            <div className={s.detailCardBody}>
              <div style={{ position: "relative", maxWidth: 200 }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted-foreground)", pointerEvents: "none" }}>₹</span>
                <input type="number" className="input-base" style={{ paddingLeft: "1.75rem" }} min="0" step="1" value={listingPrice} onChange={e => setListingPrice(Number(e.target.value))} />
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--color-muted-foreground)", marginTop: 5 }}>Seller asked: ₹{sellerPrice.toLocaleString("en-IN")}</p>
            </div>
          </div>

          {/* ── Specs ────────────────────────────────────────────────────── */}
          <div className={s.detailCard}>
            <div className={s.detailCardHead}><p className={s.detailCardTitle}>Technical Specifications</p></div>
            <div className={s.detailCardBody} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {specs.map((sp, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "center" }}>
                  <input type="text" className="input-base" placeholder="Key (e.g. Storage)" value={sp.key}   onChange={e => setSpecK(i, e.target.value)} />
                  <input type="text" className="input-base" placeholder="Value (e.g. 128 GB)" value={sp.value} onChange={e => setSpecV(i, e.target.value)} />
                  <button type="button" onClick={() => rmSpec(i)} style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 4 }}><Trash2 size={14} /></button>
                </div>
              ))}
              <button type="button" onClick={addSpec} className={s.btnGhost} style={{ alignSelf: "flex-start", padding: "5px 12px" }}><Plus size={13} /> Add Spec</button>
            </div>
          </div>

          {/* ── Images ───────────────────────────────────────────────────── */}
          <div className={s.detailCard}>
            <div className={s.detailCardHead}><p className={s.detailCardTitle}>Product Images</p></div>
            <div className={s.detailCardBody} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontSize: "0.78rem", color: "var(--color-muted-foreground)" }}>
                Seller images pre-filled. Paste Cloudinary URLs to override, or use Web Scrape to pull from a product page.
              </p>
              {imageUrls.map((url, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="text" className="input-base" style={{ flex: 1 }} placeholder="https://…" value={url} onChange={e => setImg(i, e.target.value)} />
                  {url && <img src={url} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4, border: "1px solid var(--color-border)", flexShrink: 0 }} />}
                  {imageUrls.length > 1 && (
                    <button type="button" onClick={() => rmImg(i)} style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 4, flexShrink: 0 }}><Trash2 size={14} /></button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addImg} className={s.btnGhost} style={{ alignSelf: "flex-start", padding: "5px 12px" }}><Plus size={13} /> Add Image URL</button>
            </div>
          </div>

          {/* ── Actions ─────────────────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingBottom: "1rem" }}>
            {liveProduct  && <button type="button" className={s.btnGhost} onClick={() => setMode("view")}>Cancel</button>}
            {!liveProduct && <button type="button" className={s.btnGhost} onClick={() => router.push(`/admin/our-inventory/${slug}`)}>Cancel</button>}
            <button type="button" className={s.btnPrimary} onClick={handleSave} disabled={isPending}>
              {isPending ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
              {isPending ? "Saving…" : liveProduct ? "Save Changes" : "Save to Website Inventory"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
