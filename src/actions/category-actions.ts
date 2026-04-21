"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";

const log = logger("category-actions");
import {
  getCategoryConfig,
  mapAndValidateCsvRow,
  chunkArray,
  DB_CHUNK_SIZE,
  validateSpecsRow,
} from "@/lib/categories";

// ─── Local type aliases (mirrors Prisma enums — sync with schema) ─────────────
// Using string literals here so the file compiles before `prisma generate` is run.
// Once the migration + generate run, you can import directly from "@prisma/client".

type CategoryTypeEnum =
  | "SPARE_PARTS"
  | "VRP"
  | "NEW_PHONES"
  | "PREXO"
  | "OPEN_BOX";

type DraftStatusEnum =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "NEEDS_CHANGES";

type PartConditionEnum = "NEW" | "OEM" | "AFTERMARKET" | "REFURBISHED";

// ─── Shared types ─────────────────────────────────────────────────────────────

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

/** Serialisable draft row sent to the client shell */
export interface CategoryDraftRow {
  id:              string;
  brand:           string;
  modelName:       string;
  partName:        string | null;
  condition:       string | null;
  price:           string;           // Decimal → string
  quantity:        number;
  status:          DraftStatusEnum;
  specs:           Record<string, unknown> | null;
  batchId:         string | null;
  createdAt:       string;           // ISO string
  rejectionReason: string | null;    // admin feedback on REJECTED / NEEDS_CHANGES
  // admin only
  sellerName?: string;
}

export interface BrandWithModels {
  id:     string;
  name:   string;
  models: { id: string; name: string }[];
}

// ─── Guard helpers ─────────────────────────────────────────────────────────────

/** Used for listing — no KYC check, just needs a valid seller session */
async function getSellerProfile() {
  const session = await auth();
  if (!session || session.user.role !== "SELLER") return { error: "Unauthorized" as const };
  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) return { error: "Seller profile not found" as const };
  return { profile };
}

/** Used for create/upload — requires KYC_APPROVED */
async function getVerifiedSeller() {
  const session = await auth();
  if (!session || session.user.role !== "SELLER") return { error: "Unauthorized" as const };
  if (session.user.verificationStatus !== "KYC_APPROVED")
    return { error: "KYC must be approved before listing products" as const };
  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) return { error: "Seller profile not found" as const };
  return { profile, userId: session.user.id as string };
}

async function getAdminSession() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return { error: "Unauthorized" as const };
  return { session };
}

/** Map URL slug → CategoryType enum string */
function slugToEnum(slug: string): CategoryTypeEnum | null {
  const map: Record<string, CategoryTypeEnum> = {
    "spare-parts": "SPARE_PARTS",
    "vrp":         "VRP",
    "new-phones":  "NEW_PHONES",
    "prexo":       "PREXO",
    "open-box":    "OPEN_BOX",
  };
  return map[slug] ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serialiseDraft(d: any, includeSellerName = false): CategoryDraftRow {
  return {
    id:              d.id,
    brand:           d.brand,
    modelName:       d.modelName,
    partName:        d.partName ?? null,
    condition:       d.condition ?? null,
    price:           d.price.toString(),
    quantity:        d.quantity,
    status:          d.status as DraftStatusEnum,
    specs:           d.specs as Record<string, unknown> | null,
    batchId:         d.batchId,
    createdAt:       d.createdAt.toISOString(),
    rejectionReason: d.rejectionReason ?? null,
    ...(includeSellerName && { sellerName: d.sellerProfile?.user?.fullName ?? "—" }),
  };
}

// ─── 1. List drafts for a category (seller view) ──────────────────────────────

export async function listCategoryDraftsAction(
  slug: string
): Promise<ActionResult<CategoryDraftRow[]>> {
  const guard = await getSellerProfile();
  if ("error" in guard) return { success: false, error: String(guard.error) };

  const categoryType = slugToEnum(slug);
  if (!categoryType) return { success: false, error: "Unknown category" };

  const drafts = await prisma.catalogProductDraft.findMany({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where:   { sellerProfileId: guard.profile.id, categoryType: categoryType as any },
    orderBy: { createdAt: "desc" },
    take:    500,
    include: { sellerProfile: { include: { user: { select: { fullName: true } } } } },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { success: true, data: (drafts as any[]).map((d) => serialiseDraft(d)) };
}

// ─── 2. List drafts for a category (admin view) ───────────────────────────────

export async function listAdminCategoryDraftsAction(
  slug:           string,
  statusFilter?:  string
): Promise<ActionResult<CategoryDraftRow[]>> {
  const guard = await getAdminSession();
  if ("error" in guard) return { success: false, error: String(guard.error) };

  const categoryType = slugToEnum(slug);
  if (!categoryType) return { success: false, error: "Unknown category" };

  const drafts = await prisma.catalogProductDraft.findMany({
    where: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryType: categoryType as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(statusFilter ? { status: statusFilter as any } : {}),
    },
    orderBy: { createdAt: "desc" },
    take:    500,
    include: { sellerProfile: { include: { user: { select: { fullName: true } } } } },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { success: true, data: (drafts as any[]).map((d) => serialiseDraft(d, true)) };
}

// ─── 3. Get upload dates for the calendar filter ──────────────────────────────

export async function getDraftUploadDatesAction(
  slug: string
): Promise<ActionResult<string[]>> {
  const guard = await getSellerProfile();
  if ("error" in guard) return { success: false, error: String(guard.error) };

  const categoryType = slugToEnum(slug);
  if (!categoryType) return { success: false, error: "Unknown category" };

  const rows = await prisma.catalogProductDraft.findMany({
    where: {
      sellerProfileId: guard.profile.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryType: categoryType as any,
    },
    select: { createdAt: true },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dates: string[] = [...new Set((rows as any[]).map((r) => (r.createdAt as Date).toISOString().slice(0, 10)))];
  return { success: true, data: dates };
}

// ─── 4. Get brands with models ────────────────────────────────────────────────

export async function getBrandsWithModelsAction(): Promise<ActionResult<BrandWithModels[]>> {
  const brands = await prisma.brand.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      models: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true },
      },
    },
  });
  return {
    success: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: (brands as any[]).map((b) => ({
      id:     b.id as string,
      name:   b.name as string,
      models: (b.models as { id: string; name: string }[]),
    })),
  };
}

// ─── 5. Create a single draft manually ───────────────────────────────────────

export async function createCategoryDraftAction(
  slug:     string,
  rawSpecs: Record<string, unknown>
): Promise<ActionResult<{ draftId: string }>> {
  const guard = await getVerifiedSeller();
  if ("error" in guard) return { success: false, error: String(guard.error) };

  const config = getCategoryConfig(slug);
  if (!config) return { success: false, error: "Unknown category" };

  const categoryType = slugToEnum(slug);
  if (!categoryType) return { success: false, error: "Unknown category" };

  const { data, errors } = validateSpecsRow(config, rawSpecs);

  if (errors.length > 0) {
    const fieldErrors: Record<string, string[]> = {};
    for (const e of errors) {
      fieldErrors[e.field] = [...(fieldErrors[e.field] ?? []), e.message];
    }
    return { success: false, error: "Validation failed", fieldErrors };
  }

  const specs = data!;
  const brand     = String(specs.brand ?? "");
  const modelName = String(specs.model_name ?? "");
  const price     = Number(specs.price);
  const quantity  = Number(specs.quantity);
  const partName  = slug === "spare-parts" ? (String(specs.part_name ?? "") || null) : null;
  const condition = slug === "spare-parts" && specs.condition
    ? (specs.condition as PartConditionEnum)
    : null;

  const draft = await prisma.catalogProductDraft.create({
    data: {
      sellerProfileId: guard.profile.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categoryType:    categoryType as any,
      brand,
      modelName,
      partName,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      condition:       condition as any,
      price,
      quantity,
      description: specs.description ? String(specs.description) : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      specs:       specs as any,
      status:      "PENDING_REVIEW",
    },
  });

  // Notify all admins that a new draft is awaiting review
  const sellerUser = await prisma.user.findUnique({
    where:  { id: guard.userId },
    select: { fullName: true },
  });
  const adminUsers = await prisma.user.findMany({
    where:  { role: "ADMIN" },
    select: { id: true },
  });
  if (adminUsers.length > 0) {
    await prisma.notification.createMany({
      data: adminUsers.map((admin) => ({
        userId:  admin.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type:    "DRAFT_SUBMITTED" as any,
        title:   "New listing pending review",
        message: `${sellerUser?.fullName ?? "A seller"} submitted a ${config.label} listing for review.`,
        metadata: { draftId: draft.id },
      })),
    });
  }

  revalidatePath(`/categories/${slug}`);
  return { success: true, data: { draftId: draft.id } };
}

// ─── 6. Submit CSV batch ──────────────────────────────────────────────────────

export interface RawCsvRow {
  rowNumber: number;
  fields:    Record<string, string>;
}

export interface CsvBatchResult {
  batchId:   string;
  totalRows: number;
  validRows: number;
  errorRows: number;
}

export async function submitCategoryBatchAction(
  slug:     string,
  filename: string,
  rawRows:  RawCsvRow[]
): Promise<ActionResult<CsvBatchResult>> {
  const guard = await getVerifiedSeller();
  if ("error" in guard) return { success: false, error: String(guard.error) };

  const config = getCategoryConfig(slug);
  if (!config) return { success: false, error: "Unknown category" };

  const categoryType = slugToEnum(slug);
  if (!categoryType) return { success: false, error: "Unknown category" };

  if (rawRows.length === 0) return { success: false, error: "No rows to submit" };

  const batch = await prisma.catalogUploadBatch.create({
    data: {
      sellerProfileId: guard.profile.id,
      filename,
      status:    "PROCESSING",
      totalRows: rawRows.length,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validDrafts:   any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invalidDrafts: any[] = [];

  for (const row of rawRows) {
    const { data, errors } = mapAndValidateCsvRow(config, row.fields);

    const base = {
      sellerProfileId: guard.profile.id,
      batchId:         batch.id,
      rowNumber:       row.rowNumber,
      categoryType,
      brand:           String(row.fields.brand ?? ""),
      modelName:       String(row.fields.model_name ?? ""),
      price:           data ? Number(data.price) : 0,
      quantity:        data ? Number(data.quantity) : 0,
      partName:
        slug === "spare-parts" ? (String(row.fields.part_name ?? "") || null) : null,
      condition:
        slug === "spare-parts" && data?.condition
          ? (data.condition as string)
          : null,
      specs:     data ?? undefined,
      rowErrors: errors.length > 0 ? errors : undefined,
      status:    errors.length === 0 ? "PENDING_REVIEW" : "DRAFT",
    };

    if (errors.length === 0) validDrafts.push(base);
    else invalidDrafts.push(base);
  }

  const allDrafts = [...validDrafts, ...invalidDrafts];
  const chunks = chunkArray(allDrafts, DB_CHUNK_SIZE);
  for (const chunk of chunks) {
    await prisma.catalogProductDraft.createMany({ data: chunk });
  }

  const batchStatus =
    invalidDrafts.length === 0
      ? "SUBMITTED"
      : validDrafts.length === 0
      ? "FAILED"
      : "PARTIALLY_VALID";

  await prisma.catalogUploadBatch.update({
    where: { id: batch.id },
    data:  {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status:    batchStatus as any,
      validRows: validDrafts.length,
      errorRows: invalidDrafts.length,
    },
  });

  // Notify admins if there are valid drafts to review
  if (validDrafts.length > 0) {
    const sellerUser = await prisma.user.findUnique({
      where:  { id: guard.userId },
      select: { fullName: true },
    });
    const adminUsers = await prisma.user.findMany({
      where:  { role: "ADMIN" },
      select: { id: true },
    });
    if (adminUsers.length > 0) {
      await prisma.notification.createMany({
        data: adminUsers.map((admin) => ({
          userId:  admin.id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          type:    "DRAFT_SUBMITTED" as any,
          title:   "New batch pending review",
          message: `${sellerUser?.fullName ?? "A seller"} uploaded a ${config.label} CSV batch with ${validDrafts.length} listing${validDrafts.length !== 1 ? "s" : ""} ready for review.`,
          metadata: { batchId: batch.id },
        })),
      });
    }
  }

  revalidatePath(`/categories/${slug}`);

  return {
    success: true,
    data: {
      batchId:   batch.id,
      totalRows: rawRows.length,
      validRows: validDrafts.length,
      errorRows: invalidDrafts.length,
    },
  };
}
