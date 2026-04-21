"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  rejectDraftSchema,
  requestChangesSchema,
  enrichProductSchema,
  type EnrichProductInput,
} from "@/lib/validations/admin";

const log = logger("admin-actions");
import type {
  DraftStatus,
  SellerProductStatus,
  LiveProductStatus,
  NotificationType,
} from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// ─── Guard ────────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return { error: "Unauthorized — admin access only" as const };
  }
  return { adminId: session.user.id as string };
}

// ─── Slug generator ───────────────────────────────────────────────────────────

function generateSlug(brand: string, modelName: string, partName: string, id: string): string {
  const base = `${brand} ${modelName} ${partName}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `${base}-${id.slice(-6)}`; // 6-char suffix from CUID for uniqueness
}

// ─── Notification helper ──────────────────────────────────────────────────────

async function notifySeller(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  metadata?: Record<string, string>
) {
  await tx.notification.create({
    data: { userId, type, title, message, metadata: metadata ?? undefined },
  });
}

// ─── approveKycAction ─────────────────────────────────────────────────────────
// Server action — called from KYC detail page form.

export async function approveKycAction(formData: FormData): Promise<void> {
  const guard = await requireAdmin();
  if ("error" in guard) return;
  const { adminId } = guard;

  const kycId = formData.get("kycId") as string;
  if (!kycId) return;

  const kyc = await prisma.kycSubmission.findUnique({
    where: { id: kycId },
    select: { status: true, sellerProfile: { select: { userId: true } } },
  });
  if (!kyc || (kyc.status !== "SUBMITTED" && kyc.status !== "UNDER_REVIEW")) return;

  await prisma.$transaction([
    prisma.kycSubmission.update({
      where: { id: kycId },
      data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: adminId },
    }),
    prisma.user.update({
      where: { id: kyc.sellerProfile.userId },
      data: { verificationStatus: "KYC_APPROVED" },
    }),
    prisma.notification.create({
      data: {
        userId: kyc.sellerProfile.userId,
        type: "KYC_APPROVED",
        title: "KYC Approved",
        message: "Your KYC has been approved. You can now list products on MobiGrade Portal.",
      },
    }),
  ]);
}

// ─── rejectKycAction ──────────────────────────────────────────────────────────

export async function rejectKycAction(formData: FormData): Promise<void> {
  const guard = await requireAdmin();
  if ("error" in guard) return;
  const { adminId } = guard;

  const kycId = formData.get("kycId") as string;
  const reason = (formData.get("reason") as string)?.trim();
  if (!kycId || !reason) return;

  const kyc = await prisma.kycSubmission.findUnique({
    where: { id: kycId },
    select: { status: true, sellerProfile: { select: { userId: true } } },
  });
  if (!kyc || (kyc.status !== "SUBMITTED" && kyc.status !== "UNDER_REVIEW")) return;

  await prisma.$transaction([
    prisma.kycSubmission.update({
      where: { id: kycId },
      data: {
        status: "REJECTED",
        rejectionReason: reason,
        reviewedAt: new Date(),
        reviewedById: adminId,
      },
    }),
    prisma.user.update({
      where: { id: kyc.sellerProfile.userId },
      data: { verificationStatus: "KYC_REJECTED" },
    }),
    prisma.notification.create({
      data: {
        userId: kyc.sellerProfile.userId,
        type: "KYC_REJECTED",
        title: "KYC Rejected",
        message: `Your KYC submission was not approved. Reason: ${reason}`,
        metadata: { reason },
      },
    }),
  ]);
}

// ─── approveDraftAction ───────────────────────────────────────────────────────
// Creates SellerProduct from approved draft in an atomic transaction.
// Also auto-creates a stub LiveProduct (DRAFT) ready for enrichment.

export async function approveDraftAction(
  draftId: string
): Promise<ActionResult<{ sellerProductId: string }>> {
  const guard = await requireAdmin();
  if ("error" in guard) return { success: false, error: guard.error as string };
  const { adminId } = guard;

  const draft = await prisma.catalogProductDraft.findUnique({
    where: { id: draftId },
    select: {
      id: true,
      status: true,
      brand: true,
      modelName: true,
      partName: true,
      partNumber: true,
      condition: true,
      price: true,
      quantity: true,
      description: true,
      imageUrls: true,
      sellerProfileId: true,
      categoryId: true,
      sellerProfile: { select: { id: true, userId: true, businessName: true } },
      category: { select: { id: true } },
    },
  });

  if (!draft) return { success: false, error: "Draft not found" };

  if (draft.status !== "PENDING_REVIEW") {
    return {
      success: false,
      error: `Draft is ${draft.status} — only PENDING_REVIEW drafts can be approved`,
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create SellerProduct (immutable approval snapshot)
    const sellerProduct = await tx.sellerProduct.create({
      data: {
        draftId: draft.id,
        sellerProfileId: draft.sellerProfileId,
        categoryId: draft.categoryId,
        brand: draft.brand,
        modelName: draft.modelName,
        partName: draft.partName,
        partNumber: draft.partNumber,
        condition: draft.condition,
        sellerPrice: draft.price,
        quantity: draft.quantity,
        description: draft.description,
        imageUrls: draft.imageUrls,
        status: "ACTIVE",
        approvedById: adminId,
      },
    });

    // 2. Create stub LiveProduct (DRAFT) — pre-populated for faster enrichment
    const slug = generateSlug(draft.brand, draft.modelName, draft.partName ?? "", sellerProduct.id);
    await tx.liveProduct.create({
      data: {
        sellerProductId: sellerProduct.id,
        title: `${draft.brand} ${draft.modelName} ${draft.partName ?? ""}`.trim(),
        slug,
        description: draft.description ?? "",
        specs: [],
        imageUrls: draft.imageUrls,
        listingPrice: draft.price, // admin can adjust before publishing
        status: "DRAFT",
        enrichedById: adminId,
      },
    });

    // 3. Mark draft APPROVED
    await tx.catalogProductDraft.update({
      where: { id: draftId },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedById: adminId,
      },
    });

    // 4. Notify seller
    await notifySeller(
      tx,
      draft.sellerProfile.userId,
      "DRAFT_APPROVED",
      "Product approved!",
      `Your listing "${draft.brand} ${draft.modelName} ${draft.partName}" has been approved and is being prepared for the marketplace.`,
      { draftId: draft.id, sellerProductId: sellerProduct.id }
    );

    return sellerProduct;
  });

  log.info("approveDraft: succeeded", { draftId, sellerProductId: result.id, adminId });
  return { success: true, data: { sellerProductId: result.id } };
}

// ─── rejectDraftAction ────────────────────────────────────────────────────────

export async function rejectDraftAction(
  draftId: string,
  reason: string
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if ("error" in guard) return { success: false, error: guard.error as string };
  const { adminId } = guard;

  const parsed = rejectDraftSchema.safeParse({ reason });
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const draft = await prisma.catalogProductDraft.findUnique({
    where: { id: draftId },
    select: {
      status: true,
      brand: true,
      modelName: true,
      partName: true,
      sellerProfile: { select: { userId: true } },
    },
  });

  if (!draft) return { success: false, error: "Draft not found" };
  if (draft.status !== "PENDING_REVIEW") {
    return { success: false, error: `Cannot reject — draft is ${draft.status}` };
  }

  await prisma.$transaction([
    prisma.catalogProductDraft.update({
      where: { id: draftId },
      data: {
        status: "REJECTED",
        rejectionReason: parsed.data.reason,
        reviewedAt: new Date(),
        reviewedById: adminId,
      },
    }),
    prisma.notification.create({
      data: {
        userId: draft.sellerProfile.userId,
        type: "DRAFT_REJECTED",
        title: "Product listing rejected",
        message: `Your listing "${draft.brand} ${draft.modelName} ${draft.partName}" was not approved. Reason: ${parsed.data.reason}`,
        metadata: { draftId, reason: parsed.data.reason },
      },
    }),
  ]);

  log.info("rejectDraft: succeeded", { draftId, adminId });
  return { success: true, data: undefined };
}

// ─── requestChangesAction ─────────────────────────────────────────────────────

export async function requestChangesAction(
  draftId: string,
  reason: string
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if ("error" in guard) return { success: false, error: guard.error as string };
  const { adminId } = guard;

  const parsed = requestChangesSchema.safeParse({ reason });
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const draft = await prisma.catalogProductDraft.findUnique({
    where: { id: draftId },
    select: {
      status: true,
      brand: true,
      modelName: true,
      partName: true,
      sellerProfile: { select: { userId: true } },
    },
  });

  if (!draft) return { success: false, error: "Draft not found" };
  if (draft.status !== "PENDING_REVIEW") {
    return { success: false, error: `Cannot request changes — draft is ${draft.status}` };
  }

  await prisma.$transaction([
    prisma.catalogProductDraft.update({
      where: { id: draftId },
      data: {
        status: "NEEDS_CHANGES",
        rejectionReason: parsed.data.reason,
        reviewedAt: new Date(),
        reviewedById: adminId,
      },
    }),
    prisma.notification.create({
      data: {
        userId: draft.sellerProfile.userId,
        type: "DRAFT_NEEDS_CHANGES",
        title: "Changes requested for your listing",
        message: `Your listing "${draft.brand} ${draft.modelName} ${draft.partName}" needs changes before it can go live. Details: ${parsed.data.reason}`,
        metadata: { draftId, reason: parsed.data.reason },
      },
    }),
  ]);

  return { success: true, data: undefined };
}

// ─── enrichProductAction ──────────────────────────────────────────────────────
// Updates the stub LiveProduct with admin-curated content.
// SellerProduct status → ENRICHING while in progress, ACTIVE until published.

export async function enrichProductAction(
  sellerProductId: string,
  input: EnrichProductInput
): Promise<ActionResult<{ liveProductId: string }>> {
  const guard = await requireAdmin();
  if ("error" in guard) return { success: false, error: guard.error as string };
  const { adminId } = guard;

  const parsed = enrichProductSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const sellerProduct = await prisma.sellerProduct.findUnique({
    where: { id: sellerProductId },
    select: { status: true, liveProduct: { select: { id: true, status: true } } },
  });

  if (!sellerProduct) return { success: false, error: "Seller product not found" };

  const allowedStatuses: SellerProductStatus[] = ["ACTIVE", "ENRICHING"];
  if (!allowedStatuses.includes(sellerProduct.status)) {
    return {
      success: false,
      error: `Cannot enrich a product with status ${sellerProduct.status}`,
    };
  }

  // Slug uniqueness check (excluding current product's live record)
  if (sellerProduct.liveProduct) {
    const slugConflict = await prisma.liveProduct.findFirst({
      where: {
        slug: parsed.data.slug,
        NOT: { id: sellerProduct.liveProduct.id },
      },
    });
    if (slugConflict) {
      return {
        success: false,
        error: "Slug is already in use by another product",
        fieldErrors: { slug: ["This slug is taken"] },
      };
    }
  }

  const [, liveProduct] = await prisma.$transaction([
    prisma.sellerProduct.update({
      where: { id: sellerProductId },
      data: { status: "ENRICHING" },
    }),
    prisma.liveProduct.upsert({
      where: { sellerProductId },
      create: {
        sellerProductId,
        ...parsed.data,
        status: "DRAFT",
        enrichedById: adminId,
      },
      update: {
        ...parsed.data,
        enrichedById: adminId,
        // Keep existing publishedAt if already published (re-enriching live product)
      },
    }),
  ]);

  log.info("enrichProduct: succeeded", { sellerProductId, liveProductId: liveProduct.id, adminId });
  return { success: true, data: { liveProductId: liveProduct.id } };
}

// ─── publishProductAction ─────────────────────────────────────────────────────
// LiveProduct DRAFT → PUBLISHED, SellerProduct ENRICHING → LIVE.
// Guard: LiveProduct must have title, description, specs, images set.

export async function publishProductAction(
  sellerProductId: string
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if ("error" in guard) return { success: false, error: guard.error as string };

  const sellerProduct = await prisma.sellerProduct.findUnique({
    where: { id: sellerProductId },
    select: {
      status: true,
      liveProduct: {
        select: {
          id: true,
          status: true,
          title: true,
          description: true,
          imageUrls: true,
          specs: true,
        },
      },
    },
  });

  if (!sellerProduct) return { success: false, error: "Seller product not found" };
  if (!sellerProduct.liveProduct) {
    return { success: false, error: "Product has not been enriched yet" };
  }

  const live = sellerProduct.liveProduct;

  // Readiness checks before going live
  if (live.status === "PUBLISHED") {
    return { success: false, error: "Product is already published" };
  }
  if (!live.title || !live.description || live.imageUrls.length === 0) {
    return { success: false, error: "Product must have title, description, and at least one image before publishing" };
  }
  if (!Array.isArray(live.specs) || (live.specs as unknown[]).length === 0) {
    return { success: false, error: "Product must have at least one spec before publishing" };
  }

  await prisma.$transaction([
    prisma.liveProduct.update({
      where: { id: live.id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    }),
    prisma.sellerProduct.update({
      where: { id: sellerProductId },
      data: { status: "LIVE" },
    }),
  ]);

  log.info("publishProduct: succeeded", { sellerProductId, liveProductId: live.id });
  return { success: true, data: undefined };
}

// ─── unpublishProductAction ───────────────────────────────────────────────────
// PUBLISHED → ARCHIVED. SellerProduct LIVE → PAUSED.

export async function unpublishProductAction(
  sellerProductId: string,
  targetStatus: "ARCHIVED" | "DRAFT" = "ARCHIVED"
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if ("error" in guard) return { success: false, error: guard.error as string };

  const sellerProduct = await prisma.sellerProduct.findUnique({
    where: { id: sellerProductId },
    select: { status: true, liveProduct: { select: { id: true, status: true } } },
  });

  if (!sellerProduct) return { success: false, error: "Seller product not found" };
  if (sellerProduct.status !== "LIVE") {
    return { success: false, error: "Only LIVE products can be unpublished" };
  }

  const newLiveStatus: LiveProductStatus = targetStatus;
  const newSellerStatus: SellerProductStatus =
    targetStatus === "DRAFT" ? "ENRICHING" : "PAUSED";

  await prisma.$transaction([
    prisma.liveProduct.update({
      where: { sellerProductId },
      data: { status: newLiveStatus },
    }),
    prisma.sellerProduct.update({
      where: { id: sellerProductId },
      data: { status: newSellerStatus },
    }),
  ]);

  log.info("unpublishProduct: succeeded", { sellerProductId, targetStatus });
  return { success: true, data: undefined };
}
