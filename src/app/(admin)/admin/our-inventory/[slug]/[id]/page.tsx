import { prisma }        from "@/lib/prisma";
import { notFound }      from "next/navigation";
import Link              from "next/link";
import type { Metadata } from "next";
import { ArrowLeft }     from "lucide-react";
import { getCategoryConfig } from "@/lib/categories";
import s from "../../../admin.module.css";
import EnrichForm from "./EnrichForm";

export const metadata: Metadata = { title: "Enrich Product — MobiGrade Portal" };

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

const SP_STATUS_META: Record<string, { label: string; color: string }> = {
  ACTIVE:       { label: "Active",       color: "blue"    },
  ENRICHING:    { label: "Enriching",    color: "yellow"  },
  LIVE:         { label: "Live",         color: "green"   },
  PAUSED:       { label: "Paused",       color: "neutral" },
  DISCONTINUED: { label: "Discontinued", color: "red"     },
};

export default async function OurInventoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const config = getCategoryConfig(slug);
  if (!config) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sp = await (prisma.sellerProduct as any).findUnique({
    where:   { id },
    include: {
      sellerProfile: { include: { user: { select: { fullName: true, email: true } } } },
      draft:         { select: { id: true } },
      liveProduct:   true,
    },
  });
  if (!sp) notFound();

  const sm     = SP_STATUS_META[sp.status] ?? SP_STATUS_META.ACTIVE;
  const specs  = sp.specs as Record<string, unknown> | null;
  const name   = sp.partName ? `${sp.brand} ${sp.partName}` : `${sp.brand} ${sp.modelName}`;

  // Shape liveProduct for client component
  const liveProduct = sp.liveProduct
    ? {
        id:           sp.liveProduct.id,
        title:        sp.liveProduct.title,
        slug:         sp.liveProduct.slug,
        description:  sp.liveProduct.description,
        highlights:   sp.liveProduct.highlights as string[],
        listingPrice: Number(sp.liveProduct.listingPrice),
        imageUrls:    sp.liveProduct.imageUrls as string[],
        specs:        sp.liveProduct.specs as { key: string; value: string }[],
        status:       sp.liveProduct.status,
      }
    : null;

  return (
    <div className={s.page}>

      {/* Header */}
      <div>
        <Link href={`/admin/our-inventory/${slug}`} className={s.backLink}>
          <ArrowLeft size={13} /> {config.label} Inventory
        </Link>
        <div className={s.topBar} style={{ marginTop: 6 }}>
          <div className={s.topBarLeft}>
            <h1 className={s.pageTitle}>{name}</h1>
            <p className={s.pageCount}>
              {sp.brand} · {sp.modelName}
              {sp.partNumber && ` · #${sp.partNumber}`}
            </p>
          </div>
          <div className={s.topBarRight}>
            <span className={`${s.badge} ${s["badge--lg"]} ${s[`badge--${sm.color}`]}`}>
              {sm.label}
            </span>
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className={s.detailGrid}>

        {/* Product snapshot */}
        <div className={s.detailCard}>
          <div className={s.detailCardHead}><p className={s.detailCardTitle}>Product Snapshot</p></div>
          <div className={s.detailCardBody}>
            <dl className={s.detailList}>
              <dt>Brand</dt>      <dd>{sp.brand}</dd>
              <dt>Model</dt>      <dd>{sp.modelName}</dd>
              {sp.partName   && <><dt>Part Name</dt>   <dd>{sp.partName}</dd></>}
              {sp.partNumber && <><dt>Part No.</dt>    <dd>{sp.partNumber}</dd></>}
              {sp.condition  && <><dt>Condition</dt>   <dd>{sp.condition}</dd></>}
              <dt>Seller Price</dt>
              <dd style={{ fontWeight: 600 }}>₹{Number(sp.sellerPrice).toLocaleString("en-IN")}</dd>
              <dt>Quantity</dt>   <dd>{sp.quantity}</dd>
              {sp.description && <><dt>Description</dt><dd style={{ whiteSpace: "pre-wrap" }}>{sp.description}</dd></>}
            </dl>
          </div>
        </div>

        {/* Seller info */}
        <div className={s.detailCard}>
          <div className={s.detailCardHead}><p className={s.detailCardTitle}>Seller</p></div>
          <div className={s.detailCardBody}>
            <dl className={s.detailList}>
              <dt>Name</dt>     <dd>{sp.sellerProfile.user.fullName}</dd>
              <dt>Email</dt>    <dd>{sp.sellerProfile.user.email}</dd>
              <dt>Approved</dt> <dd>{fmtDate(sp.approvedAt)}</dd>
              <dt>Draft</dt>
              <dd>
                <Link href={`/admin/product-review/${sp.draft.id}`} style={{ color: "var(--color-accent)", fontWeight: 500, textDecoration: "none" }}>
                  View original submission →
                </Link>
              </dd>
            </dl>
          </div>
        </div>

        {/* Specs (phone categories) */}
        {specs && Object.keys(specs).length > 0 && (
          <div className={s.detailCard}>
            <div className={s.detailCardHead}><p className={s.detailCardTitle}>Specifications</p></div>
            <div className={s.detailCardBody}>
              <dl className={s.detailList}>
                {Object.entries(specs).map(([key, val]) => (
                  <>
                    <dt key={`k-${key}`} style={{ textTransform: "capitalize" }}>{key.replace(/_/g, " ")}</dt>
                    <dd key={`v-${key}`}>{Array.isArray(val) ? (val as string[]).join(", ") : String(val ?? "—")}</dd>
                  </>
                ))}
              </dl>
            </div>
          </div>
        )}

      </div>

      {/* Seller images */}
      {sp.imageUrls.length > 0 && (
        <div className={s.detailCard}>
          <div className={s.detailCardHead}><p className={s.detailCardTitle}>Seller-Provided Images ({sp.imageUrls.length})</p></div>
          <div className={s.imageGallery}>
            {(sp.imageUrls as string[]).map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer">
                <img src={url} alt={`Image ${i + 1}`} className={s.galleryImg} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 4 }}>
        <p style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-muted-foreground)" }}>
          Website Listing Enrichment
        </p>
      </div>

      {/* Enrichment form */}
      <EnrichForm
        sellerProductId={id}
        slug={slug}
        sellerBrand={sp.brand}
        sellerModel={sp.modelName}
        sellerPartName={sp.partName ?? null}
        sellerPrice={Number(sp.sellerPrice)}
        sellerImages={sp.imageUrls as string[]}
        sellerDesc={sp.description ?? null}
        sellerSpecs={specs}
        productName={name}
        liveProduct={liveProduct}
      />

    </div>
  );
}
