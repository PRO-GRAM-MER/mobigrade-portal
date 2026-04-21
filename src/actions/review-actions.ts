"use server";

import { auth }             from "@/auth";
import { prisma }           from "@/lib/prisma";
import { logger }           from "@/lib/logger";
import { revalidatePath }   from "next/cache";

const log = logger("review-actions");

// ─── Types ───────────────────────────────────────────────────────────────────

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface PublishData {
  title:        string;
  slug:         string;
  description:  string;
  highlights:   string[];          // 3-6 bullet points
  listingPrice: number;
  imageUrls:    string[];
  specs:        { key: string; value: string }[];
}

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");
  return session;
}

// ─── 1. Approve draft ─────────────────────────────────────────────────────────
// Approving immediately snapshots the draft into SellerProduct so it appears
// in Our Inventory. LiveProduct is created later during enrichment.

export async function approveDraftAction(
  draftId: string
): Promise<ActionResult> {
  try {
    const session = await requireAdmin();

    const draft = await prisma.catalogProductDraft.findUnique({
      where:   { id: draftId },
      include: { sellerProfile: { select: { id: true } } },
    });
    if (!draft) return { success: false, error: "Draft not found" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.catalogProductDraft.update({
      where: { id: draftId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data:  { status: "APPROVED" as any, reviewedAt: new Date(), reviewedById: session.user.id },
    });

    // Create SellerProduct snapshot (idempotent — skip if already exists)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (prisma.sellerProduct as any).findUnique({ where: { draftId } });
    if (!existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma.sellerProduct as any).create({
        data: {
          draftId,
          sellerProfileId: draft.sellerProfile.id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          categoryType:    (draft as any).categoryType,
          brand:           draft.brand,
          modelName:       draft.modelName,
          partName:        draft.partName,
          partNumber:      draft.partNumber,
          condition:       draft.condition,
          specs:           draft.specs,
          sellerPrice:     draft.price,
          quantity:        draft.quantity,
          description:     draft.description,
          imageUrls:       draft.imageUrls,
          approvedById:    session.user.id,
          approvedAt:      new Date(),
        },
      });
    }

    revalidatePath("/admin/product-review");
    revalidatePath(`/admin/product-review/${draftId}`);
    revalidatePath("/admin/our-inventory", "layout");
    log.info("approveDraft: succeeded", { draftId });
    return { success: true, data: undefined };
  } catch (e) {
    log.error("approveDraft: failed", { draftId, error: String(e) });
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

// ─── 2. Reject draft ─────────────────────────────────────────────────────────

export async function rejectDraftAction(
  draftId: string,
  reason:  string
): Promise<ActionResult> {
  try {
    await requireAdmin();
    if (!reason.trim()) return { success: false, error: "Rejection reason is required" };
    await prisma.catalogProductDraft.update({
      where: { id: draftId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data:  { status: "REJECTED" as any, rejectionReason: reason },
    });
    revalidatePath("/admin/product-review");
    revalidatePath(`/admin/product-review/${draftId}`);
    log.info("rejectDraft: succeeded", { draftId });
    return { success: true, data: undefined };
  } catch (e) {
    log.error("rejectDraft: failed", { draftId, error: String(e) });
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

// ─── 3. Request changes ───────────────────────────────────────────────────────

export async function requestChangesDraftAction(
  draftId: string,
  reason:  string
): Promise<ActionResult> {
  try {
    await requireAdmin();
    if (!reason.trim()) return { success: false, error: "Please specify what changes are needed" };
    await prisma.catalogProductDraft.update({
      where: { id: draftId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data:  { status: "NEEDS_CHANGES" as any, rejectionReason: reason },
    });
    revalidatePath("/admin/product-review");
    revalidatePath(`/admin/product-review/${draftId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

// ─── 4. Publish to website ────────────────────────────────────────────────────
//
// Flow:
//   CatalogProductDraft (APPROVED)
//     → SellerProduct    (snapshot of approved draft)
//     → LiveProduct      (enriched website-ready record)
//
// If SellerProduct already exists for this draft, we update the LiveProduct
// so admins can re-publish with corrected enrichment data.
// ─────────────────────────────────────────────────────────────────────────────

export async function publishDraftAction(
  draftId: string,
  data:    PublishData
): Promise<ActionResult<{ sellerProductId: string; liveProductId: string }>> {
  try {
    const session = await requireAdmin();

    const draft = await prisma.catalogProductDraft.findUnique({
      where:   { id: draftId },
      include: { sellerProfile: { select: { id: true } } },
    });
    if (!draft) return { success: false, error: "Draft not found" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((draft as any).status !== "APPROVED")
      return { success: false, error: "Draft must be APPROVED before publishing" };

    // Slug uniqueness check
    const slugConflict = await prisma.liveProduct.findUnique({ where: { slug: data.slug } });
    if (slugConflict) return { success: false, error: `Slug "${data.slug}" is already taken` };

    // Upsert SellerProduct (in case admin publishes twice)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sellerProduct = await (prisma.sellerProduct as any).findUnique({ where: { draftId } });

    if (!sellerProduct) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sellerProduct = await (prisma.sellerProduct as any).create({
        data: {
          draftId,
          sellerProfileId: draft.sellerProfile.id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          categoryType:    (draft as any).categoryType,
          brand:           draft.brand,
          modelName:       draft.modelName,
          partName:        draft.partName,
          condition:       draft.condition,
          specs:           draft.specs,
          sellerPrice:     draft.price,
          quantity:        draft.quantity,
          description:     draft.description,
          imageUrls:       draft.imageUrls,
          approvedById:    session.user.id,
        },
      });
    }

    // Create LiveProduct
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const liveProduct = await (prisma.liveProduct as any).create({
      data: {
        sellerProductId: sellerProduct.id,
        title:           data.title,
        slug:            data.slug,
        description:     data.description,
        highlights:      data.highlights.filter(Boolean),
        specs:           data.specs,
        imageUrls:       data.imageUrls,
        listingPrice:    data.listingPrice,
        enrichedById:    session.user.id,
        status:          "DRAFT",
      },
    });

    revalidatePath("/admin/product-review");
    revalidatePath(`/admin/product-review/${draftId}`);
    revalidatePath("/admin/inventory");

    log.info("publishDraft: succeeded", { draftId, sellerProductId: sellerProduct.id, liveProductId: liveProduct.id });
    return {
      success: true,
      data: { sellerProductId: sellerProduct.id, liveProductId: liveProduct.id },
    };
  } catch (e) {
    log.error("publishDraft: failed", { draftId, error: String(e) });
    return { success: false, error: e instanceof Error ? e.message : "Publish failed" };
  }
}
