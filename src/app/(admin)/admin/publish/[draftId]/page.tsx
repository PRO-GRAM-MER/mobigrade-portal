import { prisma }        from "@/lib/prisma";
import { notFound }      from "next/navigation";
import Link              from "next/link";
import type { Metadata } from "next";
import { ArrowLeft }     from "lucide-react";
import s from "../../admin.module.css";
import PublishClient from "./PublishClient";

export const metadata: Metadata = { title: "Publish to Website — MobiGrade Portal" };

export default async function PublishPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = await params;

  const draft = await prisma.catalogProductDraft.findUnique({
    where: { id: draftId },
    select: {
      id:          true,
      brand:       true,
      modelName:   true,
      partName:    true,
      price:       true,
      imageUrls:   true,
      description: true,
      specs:       true,
      status:      true,
    },
  });

  if (!draft) notFound();

  // Only APPROVED drafts can be published
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((draft as any).status !== "APPROVED") {
    return (
      <div className={s.page}>
        <Link href={`/admin/product-review/${draftId}`} className={s.backLink}>
          <ArrowLeft size={13} /> Back to Submission
        </Link>
        <div className={`${s.alert} ${s["alert--error"]}`} style={{ marginTop: 8 }}>
          This draft must be in <strong>APPROVED</strong> status before it can be published.
        </div>
      </div>
    );
  }

  const draftSeed = {
    brand:       draft.brand,
    modelName:   draft.modelName,
    partName:    draft.partName ?? null,
    price:       Number(draft.price),
    imageUrls:   draft.imageUrls,
    description: draft.description ?? null,
    specs:       draft.specs as Record<string, unknown> | null,
  };

  return (
    <div className={s.page}>

      {/* ── Header ── */}
      <div>
        <Link href={`/admin/product-review/${draftId}`} className={s.backLink}>
          <ArrowLeft size={13} /> Back to Submission
        </Link>
        <div className={s.topBar} style={{ marginTop: 6 }}>
          <div className={s.topBarLeft}>
            <h1 className={s.pageTitle}>Enrich &amp; Publish</h1>
            <p className={s.pageSub}>
              {draft.brand} {draft.partName ?? draft.modelName}
              {" — "}Fill in the website-facing details, preview, then confirm to go live.
            </p>
          </div>
        </div>
      </div>

      {/* ── Steps indicator ── */}
      <div style={{ display: "flex", gap: 8, fontSize: "0.78rem", color: "var(--color-muted-foreground)" }}>
        <span style={{ fontWeight: 600, color: "var(--color-primary)" }}>1 Fill details</span>
        <span>→</span>
        <span>2 Preview</span>
        <span>→</span>
        <span>3 Confirm &amp; publish</span>
      </div>

      {/* ── Client form ── */}
      <PublishClient draftId={draftId} draftSeed={draftSeed} />

    </div>
  );
}
