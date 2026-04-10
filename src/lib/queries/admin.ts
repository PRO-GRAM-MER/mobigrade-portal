// Pure read queries for admin data.
// No "use server" — importable from both API routes and server components.
// Auth is the caller's responsibility.

import { prisma } from "@/lib/prisma";
import type { DraftStatus, SellerProductStatus } from "@prisma/client";

const PAGE_SIZE = 30;

// ─── Pending drafts (FIFO review queue) ──────────────────────────────────────

export async function queryPendingDrafts(page = 1, batchId?: string) {
  const skip = (page - 1) * PAGE_SIZE;
  const where = {
    status: "PENDING_REVIEW" as DraftStatus,
    ...(batchId ? { batchId } : {}),
  };

  const [drafts, total] = await Promise.all([
    prisma.catalogProductDraft.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        brand: true,
        modelName: true,
        partName: true,
        partNumber: true,
        condition: true,
        price: true,
        quantity: true,
        description: true,
        imageUrls: true,
        batchId: true,
        rowNumber: true,
        createdAt: true,
        category: { select: { name: true } },
        sellerProfile: {
          select: {
            id: true,
            businessName: true,
            user: { select: { fullName: true, email: true } },
          },
        },
        batch: {
          select: { filename: true, totalRows: true, validRows: true },
        },
      },
    }),
    prisma.catalogProductDraft.count({ where }),
  ]);

  return { drafts, total, page, pageSize: PAGE_SIZE };
}

// ─── Batches with pending drafts ─────────────────────────────────────────────

export async function queryPendingBatches() {
  return prisma.catalogUploadBatch.findMany({
    where: {
      drafts: { some: { status: "PENDING_REVIEW" } },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      filename: true,
      totalRows: true,
      validRows: true,
      errorRows: true,
      createdAt: true,
      sellerProfile: {
        select: {
          businessName: true,
          user: { select: { fullName: true, email: true } },
        },
      },
      _count: { select: { drafts: { where: { status: "PENDING_REVIEW" } } } },
    },
  });
}

// ─── Approved seller products ─────────────────────────────────────────────────

export async function querySellerProducts(status?: SellerProductStatus, page = 1) {
  const skip = (page - 1) * PAGE_SIZE;
  const where = status ? { status } : {};

  const [products, total] = await Promise.all([
    prisma.sellerProduct.findMany({
      where,
      orderBy: { approvedAt: "desc" },
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        brand: true,
        modelName: true,
        partName: true,
        condition: true,
        sellerPrice: true,
        quantity: true,
        status: true,
        approvedAt: true,
        imageUrls: true,
        category: { select: { name: true } },
        sellerProfile: {
          select: {
            businessName: true,
            user: { select: { fullName: true } },
          },
        },
        liveProduct: {
          select: {
            id: true,
            title: true,
            slug: true,
            listingPrice: true,
            status: true,
            publishedAt: true,
          },
        },
      },
    }),
    prisma.sellerProduct.count({ where }),
  ]);

  return { products, total, page, pageSize: PAGE_SIZE };
}
