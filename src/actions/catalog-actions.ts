"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  productRowSchema,
  validateCsvRow,
  MAX_CSV_ROWS,
  type ProductRowInput,
  type CsvRowResult,
} from "@/lib/validations/catalog";
import type { DraftStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// Raw CSV row as sent from the client (may contain invalid data)
export interface RawCsvRow {
  rowNumber: number;
  fields: Record<string, string>;
}

export interface BatchSubmitResult {
  batchId: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
}

export interface DraftListItem {
  id: string;
  brand: string;
  modelName: string;
  partName: string;
  condition: string;
  price: string;
  quantity: number;
  status: DraftStatus;
  batchId: string | null;
  rowNumber: number | null;
  rowErrors: unknown;
  createdAt: Date;
}

// ─── Guard helpers ────────────────────────────────────────────────────────────

async function getVerifiedSeller() {
  const session = await auth();
  if (!session || session.user.role !== "SELLER") {
    return { error: "Unauthorized" as const };
  }
  if (session.user.verificationStatus !== "KYC_APPROVED") {
    return { error: "KYC must be approved before listing products" as const };
  }

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) return { error: "Seller profile not found" as const };

  return { sellerProfileId: profile.id };
}

// ─── submitCsvBatchAction ─────────────────────────────────────────────────────
// Client sends: filename + raw parsed rows (Record<string, string>[])
// Server: re-validates each row with Zod, creates batch + all drafts atomically.
// Valid rows → PENDING_REVIEW | Invalid rows → DRAFT (stored with rowErrors)

export async function submitCsvBatchAction(
  filename: string,
  rawRows: RawCsvRow[]
): Promise<ActionResult<BatchSubmitResult>> {
  const guard = await getVerifiedSeller();
  if ("error" in guard) return { success: false, error: guard.error as string };
  const { sellerProfileId } = guard;

  if (!filename.trim()) return { success: false, error: "Filename is required" };
  if (rawRows.length === 0) return { success: false, error: "No rows to submit" };
  if (rawRows.length > MAX_CSV_ROWS) {
    return {
      success: false,
      error: `Maximum ${MAX_CSV_ROWS} rows per upload. Your file has ${rawRows.length} rows.`,
    };
  }

  // Re-validate every row server-side (never trust client validation alone)
  const results: CsvRowResult[] = rawRows.map((r) =>
    validateCsvRow(r.fields, r.rowNumber)
  );

  const validResults = results.filter((r) => r.valid);
  const errorResults = results.filter((r) => !r.valid);

  const batchStatus =
    errorResults.length === 0
      ? "VALIDATED"
      : validResults.length === 0
      ? "FAILED"
      : "PARTIALLY_VALID";

  // Look up category IDs for valid rows that specify a category name
  const categoryNames = [
    ...new Set(
      validResults
        .map((r) => r.data?.category?.trim())
        .filter((c): c is string => !!c)
    ),
  ];

  const categories =
    categoryNames.length > 0
      ? await prisma.sparePartCategory.findMany({
          where: { name: { in: categoryNames } },
          select: { id: true, name: true },
        })
      : [];

  const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

  // Create batch + all draft rows in one transaction
  const batch = await prisma.$transaction(async (tx) => {
    const batch = await tx.catalogUploadBatch.create({
      data: {
        sellerProfileId,
        filename,
        status: batchStatus,
        totalRows: results.length,
        validRows: validResults.length,
        errorRows: errorResults.length,
      },
    });

    if (results.length > 0) {
      // Prisma 7: JSON fields require InputJsonValue — cast needed for rowErrors array
      const draftRows: Prisma.CatalogProductDraftCreateManyInput[] = results.map((r) => {
        const isValid = r.valid && r.data !== null;
        const d = r.data;
        const categoryId = d?.category
          ? (categoryMap.get(d.category.toLowerCase()) ?? null)
          : null;

        return {
          sellerProfileId,
          batchId: batch.id,
          rowNumber: r.rowNumber,
          brand: d?.brand ?? r.raw["brand"] ?? "",
          modelName: d?.model_name ?? r.raw["model_name"] ?? "",
          partName: d?.part_name ?? r.raw["part_name"] ?? "",
          partNumber: d?.part_number || null,
          categoryId,
          condition: (d?.condition ?? "NEW") as any,
          price: d?.price ?? 0,
          quantity: d?.quantity ?? 0,
          description: d?.description || null,
          imageUrls: [],
          rowErrors: r.errors.length > 0 ? (r.errors as object[]) : undefined,
          status: (isValid ? "PENDING_REVIEW" : "DRAFT") as "PENDING_REVIEW" | "DRAFT",
        };
      });

      await tx.catalogProductDraft.createMany({ data: draftRows });
    }

    return batch;
  });

  return {
    success: true,
    data: {
      batchId: batch.id,
      totalRows: results.length,
      validRows: validResults.length,
      errorRows: errorResults.length,
    },
  };
}

// ─── submitManualDraftAction ──────────────────────────────────────────────────
// Single product from the manual entry form.

export async function submitManualDraftAction(
  input: ProductRowInput
): Promise<ActionResult<{ draftId: string }>> {
  const guard = await getVerifiedSeller();
  if ("error" in guard) return { success: false, error: guard.error as string };
  const { sellerProfileId } = guard;

  const parsed = productRowSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const d = parsed.data;

  const category = d.category?.trim()
    ? await prisma.sparePartCategory.findFirst({
        where: { name: { equals: d.category, mode: "insensitive" } },
        select: { id: true },
      })
    : null;

  const draft = await prisma.catalogProductDraft.create({
    data: {
      sellerProfileId,
      brand: d.brand,
      modelName: d.model_name,
      partName: d.part_name,
      partNumber: d.part_number || null,
      categoryId: category?.id ?? null,
      condition: d.condition,
      price: d.price,
      quantity: d.quantity,
      description: d.description || null,
      imageUrls: [],
      status: "PENDING_REVIEW",
    },
    select: { id: true },
  });

  return { success: true, data: { draftId: draft.id } };
}

// ─── listDraftsAction ─────────────────────────────────────────────────────────
// Returns paginated product drafts for the logged-in seller.

export async function listDraftsAction(
  page = 1,
  statusFilter?: DraftStatus
): Promise<ActionResult<{ drafts: DraftListItem[]; total: number }>> {
  const session = await auth();
  if (!session || session.user.role !== "SELLER") {
    return { success: false, error: "Unauthorized" };
  }

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) return { success: false, error: "Profile not found" };

  const PAGE_SIZE = 20;
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    sellerProfileId: profile.id,
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const [drafts, total] = await Promise.all([
    prisma.catalogProductDraft.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        brand: true,
        modelName: true,
        partName: true,
        condition: true,
        price: true,
        quantity: true,
        status: true,
        batchId: true,
        rowNumber: true,
        rowErrors: true,
        createdAt: true,
      },
    }),
    prisma.catalogProductDraft.count({ where }),
  ]);

  return {
    success: true,
    data: {
      drafts: drafts.map((d) => ({
        ...d,
        price: d.price.toString(),
      })),
      total,
    },
  };
}

// ─── listBatchesAction ────────────────────────────────────────────────────────

export async function listBatchesAction() {
  const session = await auth();
  if (!session || session.user.role !== "SELLER") return null;

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) return null;

  return prisma.catalogUploadBatch.findMany({
    where: { sellerProfileId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      filename: true,
      status: true,
      totalRows: true,
      validRows: true,
      errorRows: true,
      createdAt: true,
    },
  });
}

// ─── BatchListItem (serializable for client components) ───────────────────────

export interface BatchListItem {
  id: string;
  filename: string;
  status: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  createdAt: string; // ISO string
}

// ─── listAllBatchesAction ─────────────────────────────────────────────────────
// Full batch list (no take limit) with serialized dates for client components.

export async function listAllBatchesAction(): Promise<ActionResult<BatchListItem[]>> {
  const session = await auth();
  if (!session || session.user.role !== "SELLER") {
    return { success: false, error: "Unauthorized" };
  }

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) return { success: false, error: "Profile not found" };

  const batches = await prisma.catalogUploadBatch.findMany({
    where: { sellerProfileId: profile.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      filename: true,
      status: true,
      totalRows: true,
      validRows: true,
      errorRows: true,
      createdAt: true,
    },
  });

  return {
    success: true,
    data: batches.map((b) => ({ ...b, createdAt: b.createdAt.toISOString() })),
  };
}

// ─── listManualDraftsAction ───────────────────────────────────────────────────
// Drafts without a batchId (created via manual entry form).

export interface ClientDraftListItem {
  id: string;
  brand: string;
  modelName: string;
  partName: string;
  condition: string;
  price: string;
  quantity: number;
  status: DraftStatus;
  createdAt: string; // ISO string
}

export async function listManualDraftsAction(
  page = 1
): Promise<ActionResult<{ drafts: ClientDraftListItem[]; total: number }>> {
  const session = await auth();
  if (!session || session.user.role !== "SELLER") {
    return { success: false, error: "Unauthorized" };
  }

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) return { success: false, error: "Profile not found" };

  const PAGE_SIZE = 20;
  const skip = (page - 1) * PAGE_SIZE;
  const where = { sellerProfileId: profile.id, batchId: null as null };

  const [drafts, total] = await Promise.all([
    prisma.catalogProductDraft.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        brand: true,
        modelName: true,
        partName: true,
        condition: true,
        price: true,
        quantity: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.catalogProductDraft.count({ where }),
  ]);

  return {
    success: true,
    data: {
      drafts: drafts.map((d) => ({
        ...d,
        price: d.price.toString(),
        createdAt: d.createdAt.toISOString(),
      })),
      total,
    },
  };
}

// ─── createCsvBatchAction (strict two-step flow) ──────────────────────────────
// Step 1: Upload + validate CSV. Stores all rows as DRAFT.
//   - VALIDATED if ALL rows valid
//   - FAILED    if ANY row invalid (submission not allowed)
// Step 2: submitBatchAction promotes VALIDATED batch → SUBMITTED.

export async function createCsvBatchAction(
  filename: string,
  rawRows: RawCsvRow[]
): Promise<ActionResult<BatchSubmitResult>> {
  const guard = await getVerifiedSeller();
  if ("error" in guard) return { success: false, error: guard.error as string };
  const { sellerProfileId } = guard;

  if (!filename.trim()) return { success: false, error: "Filename is required" };
  if (rawRows.length === 0) return { success: false, error: "No rows to submit" };
  if (rawRows.length > MAX_CSV_ROWS) {
    return {
      success: false,
      error: `Maximum ${MAX_CSV_ROWS} rows per upload. Your file has ${rawRows.length} rows.`,
    };
  }

  const results: CsvRowResult[] = rawRows.map((r) =>
    validateCsvRow(r.fields, r.rowNumber)
  );

  const validResults = results.filter((r) => r.valid);
  const errorResults = results.filter((r) => !r.valid);

  // Strict: no PARTIALLY_VALID — either all pass or all fail
  const batchStatus = errorResults.length === 0 ? "VALIDATED" : "FAILED";

  const categoryNames = [
    ...new Set(
      validResults
        .map((r) => r.data?.category?.trim())
        .filter((c): c is string => !!c)
    ),
  ];

  const categories =
    categoryNames.length > 0
      ? await prisma.sparePartCategory.findMany({
          where: { name: { in: categoryNames } },
          select: { id: true, name: true },
        })
      : [];

  const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

  const batch = await prisma.$transaction(async (tx) => {
    const b = await tx.catalogUploadBatch.create({
      data: {
        sellerProfileId,
        filename,
        status: batchStatus,
        totalRows: results.length,
        validRows: validResults.length,
        errorRows: errorResults.length,
      },
    });

    const draftRows: Prisma.CatalogProductDraftCreateManyInput[] = results.map((r) => {
      const d = r.data;
      const categoryId = d?.category
        ? (categoryMap.get(d.category.toLowerCase()) ?? null)
        : null;

      return {
        sellerProfileId,
        batchId: b.id,
        rowNumber: r.rowNumber,
        brand: d?.brand ?? r.raw["brand"] ?? "",
        modelName: d?.model_name ?? r.raw["model_name"] ?? "",
        partName: d?.part_name ?? r.raw["part_name"] ?? "",
        partNumber: d?.part_number || null,
        categoryId,
        condition: (d?.condition ?? "NEW") as any,
        price: d?.price ?? 0,
        quantity: d?.quantity ?? 0,
        description: d?.description || null,
        imageUrls: [],
        rowErrors: r.errors.length > 0 ? (r.errors as object[]) : undefined,
        // All rows stored as DRAFT; submitBatchAction promotes to PENDING_REVIEW
        status: "DRAFT" as const,
      };
    });

    await tx.catalogProductDraft.createMany({ data: draftRows });
    return b;
  });

  return {
    success: true,
    data: {
      batchId: batch.id,
      totalRows: results.length,
      validRows: validResults.length,
      errorRows: errorResults.length,
    },
  };
}

// ─── BatchDetail types ────────────────────────────────────────────────────────

export interface BatchDetailDraft {
  id: string;
  rowNumber: number | null;
  brand: string;
  modelName: string;
  partName: string;
  partNumber: string | null;
  condition: string;
  price: string;
  quantity: number;
  description: string | null;
  imageUrls: string[];
  status: string;
  rowErrors: unknown; // RowError[] | null
}

export interface BatchDetailData {
  id: string;
  filename: string;
  status: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  createdAt: string;
  drafts: BatchDetailDraft[];
}

// ─── getBatchDetailAction ─────────────────────────────────────────────────────

export async function getBatchDetailAction(
  batchId: string
): Promise<ActionResult<BatchDetailData>> {
  const session = await auth();
  if (!session || session.user.role !== "SELLER") {
    return { success: false, error: "Unauthorized" };
  }

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) return { success: false, error: "Profile not found" };

  const batch = await prisma.catalogUploadBatch.findFirst({
    where: { id: batchId, sellerProfileId: profile.id },
    include: {
      drafts: {
        orderBy: { rowNumber: "asc" },
        select: {
          id: true,
          rowNumber: true,
          brand: true,
          modelName: true,
          partName: true,
          partNumber: true,
          condition: true,
          price: true,
          quantity: true,
          description: true,
          imageUrls: true,
          status: true,
          rowErrors: true,
        },
      },
    },
  });

  if (!batch) return { success: false, error: "Batch not found" };

  return {
    success: true,
    data: {
      id: batch.id,
      filename: batch.filename,
      status: batch.status,
      totalRows: batch.totalRows,
      validRows: batch.validRows,
      errorRows: batch.errorRows,
      createdAt: batch.createdAt.toISOString(),
      drafts: batch.drafts.map((d) => ({
        ...d,
        price: d.price.toString(),
      })),
    },
  };
}

// ─── submitBatchAction ────────────────────────────────────────────────────────
// Promotes a VALIDATED batch to SUBMITTED; all DRAFT rows → PENDING_REVIEW.

export async function submitBatchAction(
  batchId: string
): Promise<ActionResult<void>> {
  const guard = await getVerifiedSeller();
  if ("error" in guard) return { success: false, error: guard.error as string };
  const { sellerProfileId } = guard;

  const batch = await prisma.catalogUploadBatch.findFirst({
    where: { id: batchId, sellerProfileId },
    select: { id: true, status: true, errorRows: true },
  });

  if (!batch) return { success: false, error: "Batch not found" };
  if (batch.status !== "VALIDATED") {
    return { success: false, error: "Only VALIDATED batches can be submitted for review" };
  }
  if (batch.errorRows > 0) {
    return { success: false, error: "Cannot submit batch with validation errors" };
  }

  await prisma.$transaction([
    prisma.catalogUploadBatch.update({
      where: { id: batchId },
      data: { status: "SUBMITTED" },
    }),
    prisma.catalogProductDraft.updateMany({
      where: { batchId, status: "DRAFT" },
      data: { status: "PENDING_REVIEW" },
    }),
  ]);

  revalidatePath("/spare-parts");
  revalidatePath(`/spare-parts/batches/${batchId}`);

  return { success: true, data: undefined };
}
