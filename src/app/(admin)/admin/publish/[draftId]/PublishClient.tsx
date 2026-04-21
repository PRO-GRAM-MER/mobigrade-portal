"use client";

import { useState, useTransition } from "react";
import { useRouter }               from "next/navigation";
import {
  Plus, Trash2, Loader2, Eye, ChevronLeft, Rocket, AlertCircle, CheckCircle2,
} from "lucide-react";
import { publishDraftAction, type PublishData } from "@/actions/review-actions";
import s from "../../admin.module.css";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface DraftSeed {
  brand:       string;
  modelName:   string;
  partName:    string | null;
  price:       number;
  imageUrls:   string[];
  description: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  specs:       Record<string, any> | null;
}

interface Props {
  draftId:  string;
  draftSeed: DraftSeed;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function specsFromDraft(seed: DraftSeed): { key: string; value: string }[] {
  if (!seed.specs) return [];
  return Object.entries(seed.specs)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => ({
      key:   k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value: Array.isArray(v) ? (v as string[]).join(", ") : String(v),
    }));
}

// ─── Component ─────────────────────────────────────────────────────────────────

type Step = "form" | "preview";

export default function PublishClient({ draftId, draftSeed }: Props) {
  const router                       = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep]              = useState<Step>("form");
  const [error, setError]            = useState<string | null>(null);

  // Form state — pre-filled from draft
  const productBase = draftSeed.partName
    ? `${draftSeed.brand} ${draftSeed.partName}`
    : `${draftSeed.brand} ${draftSeed.modelName}`;

  const [title,        setTitle]        = useState(productBase);
  const [slug,         setSlug]         = useState(slugify(productBase));
  const [description,  setDescription]  = useState(draftSeed.description ?? "");
  const [highlights,   setHighlights]   = useState<string[]>(["", "", ""]);
  const [listingPrice, setListingPrice] = useState<number>(draftSeed.price);
  const [imageUrls,    setImageUrls]    = useState<string[]>(draftSeed.imageUrls.length ? draftSeed.imageUrls : [""]);
  const [specs,        setSpecs]        = useState<{ key: string; value: string }[]>(
    specsFromDraft(draftSeed).length ? specsFromDraft(draftSeed) : [{ key: "", value: "" }]
  );

  // Highlight helpers
  function setHighlight(i: number, v: string) {
    setHighlights((prev) => prev.map((h, idx) => idx === i ? v : h));
  }
  function addHighlight()   { setHighlights((p) => [...p, ""]); }
  function removeHighlight(i: number) {
    setHighlights((p) => p.filter((_, idx) => idx !== i));
  }

  // Image helpers
  function setImage(i: number, v: string) {
    setImageUrls((prev) => prev.map((u, idx) => idx === i ? v : u));
  }
  function addImage()   { setImageUrls((p) => [...p, ""]); }
  function removeImage(i: number) {
    setImageUrls((p) => p.filter((_, idx) => idx !== i));
  }

  // Spec helpers
  function setSpecKey(i: number, v: string) {
    setSpecs((p) => p.map((sp, idx) => idx === i ? { ...sp, key: v } : sp));
  }
  function setSpecVal(i: number, v: string) {
    setSpecs((p) => p.map((sp, idx) => idx === i ? { ...sp, value: v } : sp));
  }
  function addSpec()    { setSpecs((p) => [...p, { key: "", value: "" }]); }
  function removeSpec(i: number) {
    setSpecs((p) => p.filter((_, idx) => idx !== i));
  }

  function handleTitleChange(v: string) {
    setTitle(v);
    setSlug(slugify(v));
  }

  function validate(): string | null {
    if (!title.trim())        return "Title is required.";
    if (!slug.trim())         return "Slug is required.";
    if (!description.trim())  return "Description is required.";
    if (highlights.filter(Boolean).length < 2) return "At least 2 highlights are required.";
    if (listingPrice <= 0)    return "Listing price must be greater than 0.";
    return null;
  }

  function buildPayload(): PublishData {
    return {
      title:        title.trim(),
      slug:         slug.trim(),
      description:  description.trim(),
      highlights:   highlights.filter(Boolean),
      listingPrice,
      imageUrls:    imageUrls.filter(Boolean),
      specs:        specs.filter((sp) => sp.key.trim() && sp.value.trim()),
    };
  }

  function handlePreview() {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setStep("preview");
  }

  function handlePublish() {
    const payload = buildPayload();
    startTransition(async () => {
      const res = await publishDraftAction(draftId, payload);
      if (res.success) {
        router.push(`/admin/product-review/${draftId}?published=1`);
      } else {
        setError(res.error);
        setStep("form");
      }
    });
  }

  // ── Preview ─────────────────────────────────────────────────────────────────

  if (step === "preview") {
    const payload = buildPayload();
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className={s.detailCard} style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <p className={s.detailCardTitle} style={{ fontSize: "1rem" }}>Preview — {payload.title}</p>
            <span className={`${s.badge} ${s["badge--blue"]}`}>{payload.slug}</span>
          </div>

          <p style={{ fontSize: "0.8375rem", color: "var(--color-muted-foreground)", lineHeight: 1.65, marginBottom: 14 }}>
            {payload.description}
          </p>

          {payload.highlights.length > 0 && (
            <ul style={{ paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
              {payload.highlights.map((h, i) => (
                <li key={i} style={{ fontSize: "0.8375rem", color: "var(--color-primary)" }}>{h}</li>
              ))}
            </ul>
          )}

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 14 }}>
            <div>
              <p style={{ fontSize: "0.72rem", color: "var(--color-muted-foreground)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Listing Price</p>
              <p style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-accent)" }}>
                ₹{payload.listingPrice.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {payload.specs.length > 0 && (
            <>
              <p style={{ fontSize: "0.72rem", color: "var(--color-muted-foreground)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Specifications
              </p>
              <dl className={s.detailList} style={{ marginBottom: 14 }}>
                {payload.specs.map((sp, i) => (
                  <><dt key={`k${i}`}>{sp.key}</dt><dd key={`v${i}`}>{sp.value}</dd></>
                ))}
              </dl>
            </>
          )}

          {payload.imageUrls.length > 0 && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {payload.imageUrls.map((url, i) => (
                <img key={i} src={url} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }} />
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className={`${s.alert} ${s["alert--error"]}`}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className={s.btnGhost} onClick={() => setStep("form")} disabled={isPending}>
            <ChevronLeft size={14} /> Edit
          </button>
          <button type="button" className={s.btnPrimary} onClick={handlePublish} disabled={isPending}>
            {isPending ? <Loader2 size={14} className="spin" /> : <Rocket size={14} />}
            {isPending ? "Publishing…" : "Confirm & Publish"}
          </button>
        </div>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Title + Slug */}
      <div className={s.detailCard}>
        <div className={s.detailCardHead}><p className={s.detailCardTitle}>Listing Identity</p></div>
        <div className={s.detailCardBody} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="form-group">
            <label className="form-label">
              Title <span style={{ color: "var(--color-accent)" }}>*</span>
            </label>
            <input
              type="text"
              className="input-base"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. Samsung Galaxy S23 Display"
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              URL Slug <span style={{ color: "var(--color-accent)" }}>*</span>
            </label>
            <input
              type="text"
              className="input-base"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="samsung-galaxy-s23-display"
            />
            <p style={{ fontSize: "0.75rem", color: "var(--color-muted-foreground)", marginTop: 3 }}>
              /products/{slug || "…"}
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className={s.detailCard}>
        <div className={s.detailCardHead}><p className={s.detailCardTitle}>Description</p></div>
        <div className={s.detailCardBody}>
          <textarea
            className={s.textarea}
            rows={5}
            placeholder="Write a detailed product description for the website…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ minHeight: 120 }}
          />
        </div>
      </div>

      {/* Highlights */}
      <div className={s.detailCard}>
        <div className={s.detailCardHead}>
          <p className={s.detailCardTitle}>Highlights <span style={{ color: "var(--color-muted-foreground)", fontWeight: 400, fontSize: "0.78rem" }}>(2–6 bullet points)</span></p>
        </div>
        <div className={s.detailCardBody} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {highlights.map((h, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                className="input-base"
                style={{ flex: 1 }}
                placeholder={`Highlight ${i + 1}`}
                value={h}
                onChange={(e) => setHighlight(i, e.target.value)}
              />
              {highlights.length > 1 && (
                <button type="button" onClick={() => removeHighlight(i)} style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 4, flexShrink: 0 }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {highlights.length < 6 && (
            <button type="button" onClick={addHighlight} className={s.btnGhost} style={{ alignSelf: "flex-start", padding: "5px 12px" }}>
              <Plus size={13} /> Add Highlight
            </button>
          )}
        </div>
      </div>

      {/* Listing Price */}
      <div className={s.detailCard}>
        <div className={s.detailCardHead}><p className={s.detailCardTitle}>Listing Price</p></div>
        <div className={s.detailCardBody}>
          <div style={{ position: "relative", maxWidth: 200 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted-foreground)", pointerEvents: "none" }}>₹</span>
            <input
              type="number"
              className="input-base"
              style={{ paddingLeft: "1.75rem" }}
              min="0"
              step="0.01"
              value={listingPrice}
              onChange={(e) => setListingPrice(Number(e.target.value))}
              placeholder="0"
            />
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--color-muted-foreground)", marginTop: 5 }}>
            Seller asked: ₹{draftSeed.price.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Specs */}
      <div className={s.detailCard}>
        <div className={s.detailCardHead}><p className={s.detailCardTitle}>Technical Specifications</p></div>
        <div className={s.detailCardBody} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {specs.map((sp, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "center" }}>
              <input type="text" className="input-base" placeholder="Key (e.g. Storage)" value={sp.key} onChange={(e) => setSpecKey(i, e.target.value)} />
              <input type="text" className="input-base" placeholder="Value (e.g. 128 GB)" value={sp.value} onChange={(e) => setSpecVal(i, e.target.value)} />
              <button type="button" onClick={() => removeSpec(i)} style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button type="button" onClick={addSpec} className={s.btnGhost} style={{ alignSelf: "flex-start", padding: "5px 12px" }}>
            <Plus size={13} /> Add Spec
          </button>
        </div>
      </div>

      {/* Image URLs */}
      <div className={s.detailCard}>
        <div className={s.detailCardHead}><p className={s.detailCardTitle}>Product Images</p></div>
        <div className={s.detailCardBody} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: "0.78rem", color: "var(--color-muted-foreground)" }}>
            Enter image URLs (Cloudinary or any CDN). Web scraping for images will be added later.
          </p>
          {imageUrls.map((url, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                className="input-base"
                style={{ flex: 1 }}
                placeholder="https://res.cloudinary.com/…"
                value={url}
                onChange={(e) => setImage(i, e.target.value)}
              />
              {url && (
                <img src={url} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4, border: "1px solid var(--color-border)", flexShrink: 0 }} />
              )}
              {imageUrls.length > 1 && (
                <button type="button" onClick={() => removeImage(i)} style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 4, flexShrink: 0 }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addImage} className={s.btnGhost} style={{ alignSelf: "flex-start", padding: "5px 12px" }}>
            <Plus size={13} /> Add Image URL
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className={`${s.alert} ${s["alert--error"]}`}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingBottom: "1rem" }}>
        <button type="button" className={s.btnGhost} onClick={() => router.back()}>
          Cancel
        </button>
        <button type="button" className={s.btnPrimary} onClick={handlePreview}>
          <Eye size={14} /> Preview
        </button>
      </div>

    </div>
  );
}
