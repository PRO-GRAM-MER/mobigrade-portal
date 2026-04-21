import React              from "react";
import { prisma }         from "@/lib/prisma";
import { notFound }       from "next/navigation";
import Link               from "next/link";
import type { Metadata }  from "next";
import {
  ArrowLeft, FileText, PenLine, AlertCircle,
} from "lucide-react";
import s from "../../admin.module.css";
import ReviewActions from "./ReviewActions";

export const metadata: Metadata = { title: "Review Submission — MobiGrade Portal" };

const CATEGORY_LABELS: Record<string, string> = {
  SPARE_PARTS: "Spare Parts",
  VRP:         "VRP",
  NEW_PHONES:  "New Phones",
  PREXO:       "PREXO",
  OPEN_BOX:    "Open Box",
};

const CATEGORY_COLORS: Record<string, string> = {
  SPARE_PARTS: "neutral",
  VRP:         "blue",
  NEW_PHONES:  "green",
  PREXO:       "orange",
  OPEN_BOX:    "yellow",
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  DRAFT:          { label: "Draft",          color: "neutral" },
  PENDING_REVIEW: { label: "Pending Review", color: "blue"    },
  APPROVED:       { label: "Approved",       color: "green"   },
  REJECTED:       { label: "Rejected",       color: "red"     },
  NEEDS_CHANGES:  { label: "Needs Changes",  color: "yellow"  },
};

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export default async function ProductReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const draft = await prisma.catalogProductDraft.findUnique({
    where: { id },
    include: {
      sellerProfile: {
        include: { user: { select: { fullName: true, email: true } } },
      },
      category: { select: { name: true } },
      batch:    { select: { filename: true, createdAt: true } },
    },
  });
  if (!draft) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cat    = String((draft as any).categoryType ?? "SPARE_PARTS");
  const sm     = STATUS_META[draft.status] ?? STATUS_META.DRAFT;
  const specs  = draft.specs as Record<string, unknown> | null;

  // Build a human-readable title for the header
  const productTitle =
    draft.partName
      ? `${draft.brand} ${draft.partName}`
      : `${draft.brand} ${draft.modelName}`;

  // Check if already published (SellerProduct exists for this draft)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sellerProduct = await (prisma.sellerProduct as any).findUnique({ where: { draftId: id } });

  return (
    <div className={s.page}>

      {/* ── Header ── */}
      <div>
        <Link href="/admin/product-review" className={s.backLink}>
          <ArrowLeft size={13} /> Back to Submissions
        </Link>
        <div className={s.topBar} style={{ marginTop: 6 }}>
          <div className={s.topBarLeft}>
            <h1 className={s.pageTitle}>{productTitle}</h1>
            <p className={s.pageCount}>
              <span className={`${s.badge} ${s[`badge--${CATEGORY_COLORS[cat] ?? "neutral"}`]}`}>
                {CATEGORY_LABELS[cat] ?? cat}
              </span>
              &nbsp;· Submitted {fmtDate(draft.createdAt)}
            </p>
          </div>
          <div className={s.topBarRight}>
            <span className={`${s.badge} ${s["badge--lg"]} ${s[`badge--${sm.color}`]}`}>
              {sm.label}
            </span>
          </div>
        </div>
      </div>

      {/* ── Rejection / Changes notice ── */}
      {(draft.status === "REJECTED" || draft.status === "NEEDS_CHANGES") && draft.rejectionReason && (
        <div className={`${s.alert} ${draft.status === "REJECTED" ? s["alert--error"] : s["alert--warning"]}`}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>{draft.status === "REJECTED" ? "Rejection reason" : "Requested changes"}:</strong>
            {" "}{draft.rejectionReason}
          </div>
        </div>
      )}

      {/* ── Already published banner ── */}
      {sellerProduct && (
        <div className={`${s.alert} ${s["alert--success"]}`}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
          This submission has already been published to the website inventory.{" "}
          <Link href={`/admin/inventory`} style={{ color: "inherit", fontWeight: 600 }}>
            View in Inventory →
          </Link>
        </div>
      )}

      {/* ── Validation errors ── */}
      {draft.rowErrors && (
        <div className={`${s.alert} ${s["alert--error"]}`}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Validation errors from CSV import:</strong>
            <ul style={{ marginTop: 6, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 3 }}>
              {(draft.rowErrors as { field: string; message: string }[]).map((e, i) => (
                <li key={i} style={{ fontSize: "0.8125rem" }}>
                  <code style={{ background: "rgba(220,38,38,0.1)", padding: "1px 4px", borderRadius: 3 }}>{e.field}</code>: {e.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── Detail cards ── */}
      <div className={s.detailGrid}>

        {/* Product Details */}
        <div className={s.detailCard}>
          <div className={s.detailCardHead}>
            <p className={s.detailCardTitle}>Product Details</p>
          </div>
          <div className={s.detailCardBody}>
            <dl className={s.detailList}>
              <dt>Brand</dt>     <dd>{draft.brand}</dd>
              <dt>Model</dt>     <dd>{draft.modelName}</dd>
              {draft.partName   && <><dt>Part Name</dt>   <dd>{draft.partName}</dd></>}
              {draft.partNumber && <><dt>Part No.</dt>    <dd>{draft.partNumber}</dd></>}
              {draft.category   && <><dt>Sub-category</dt><dd>{draft.category.name}</dd></>}
              {draft.condition  && <><dt>Condition</dt>   <dd>{draft.condition}</dd></>}
              <dt>Price</dt>     <dd style={{ fontWeight: 600, color: "var(--color-accent)" }}>₹{Number(draft.price).toLocaleString("en-IN")}</dd>
              <dt>Quantity</dt>  <dd>{draft.quantity}</dd>
              {draft.description && <><dt>Description</dt><dd style={{ whiteSpace: "pre-wrap" }}>{draft.description}</dd></>}
            </dl>
          </div>
        </div>

        {/* Seller & Submission */}
        <div className={s.detailCard}>
          <div className={s.detailCardHead}>
            <p className={s.detailCardTitle}>Submission Info</p>
          </div>
          <div className={s.detailCardBody}>
            <dl className={s.detailList}>
              <dt>Seller</dt>    <dd>{draft.sellerProfile.user.fullName}</dd>
              <dt>Email</dt>     <dd>{draft.sellerProfile.user.email}</dd>
              <dt>Source</dt>
              <dd>
                {draft.batch ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <FileText size={12} /> CSV — {draft.batch.filename}
                  </span>
                ) : (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <PenLine size={12} /> Manual entry
                  </span>
                )}
              </dd>
              {draft.batch    && <><dt>Upload date</dt><dd>{fmtDate(draft.batch.createdAt)}</dd></>}
              {draft.rowNumber && <><dt>CSV row</dt>   <dd>#{draft.rowNumber}</dd></>}
              <dt>Submitted</dt> <dd>{fmtDate(draft.createdAt)}</dd>
              {draft.reviewedAt && <><dt>Reviewed</dt> <dd>{fmtDate(draft.reviewedAt)}</dd></>}
            </dl>
          </div>
        </div>

        {/* Specs (phone categories) */}
        {specs && Object.keys(specs).length > 0 && (
          <div className={s.detailCard}>
            <div className={s.detailCardHead}>
              <p className={s.detailCardTitle}>Specifications</p>
            </div>
            <div className={s.detailCardBody}>
              <dl className={s.detailList}>
                {Object.entries(specs).map(([key, val]) => (
                  <React.Fragment key={key}>
                    <dt style={{ textTransform: "capitalize" }}>{key.replace(/_/g, " ")}</dt>
                    <dd>{Array.isArray(val) ? val.join(", ") : String(val ?? "—")}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </div>
          </div>
        )}

      </div>

      {/* ── Images ── */}
      {draft.imageUrls.length > 0 && (
        <div className={s.detailCard}>
          <div className={s.detailCardHead}>
            <p className={s.detailCardTitle}>Images ({draft.imageUrls.length})</p>
          </div>
          <div className={s.imageGallery}>
            {draft.imageUrls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer">
                <img src={url} alt={`Product image ${i + 1}`} className={s.galleryImg} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Review actions (client) ── */}
      <ReviewActions
        draftId={id}
        status={draft.status}
        isApproved={draft.status === "APPROVED" && !sellerProduct}
      />

    </div>
  );
}
