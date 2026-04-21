/**
 * Approves all PENDING_REVIEW drafts for emp1@gmail.com as the first admin user.
 * Mirrors approveDraftAction exactly: SellerProduct + LiveProduct stub + seller notification.
 * Run: npx tsx scripts/approve-all-drafts.ts
 */

import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter } as any);

function generateSlug(brand: string, modelName: string, partName: string | null, id: string): string {
  const base = `${brand} ${modelName} ${partName ?? ""}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `${base}-${id.slice(-6)}`;
}

async function main() {
  // ── Find admin ────────────────────────────────────────────────────────────
  const admin = await prisma.user.findFirst({
    where:  { role: "ADMIN" },
    select: { id: true, fullName: true },
  });
  if (!admin) throw new Error("No admin user found");
  console.log(`\n✓ Admin: ${admin.fullName} (${admin.id})\n`);

  // ── Find seller ───────────────────────────────────────────────────────────
  const seller = await prisma.user.findUnique({
    where:  { email: "emp1@gmail.com" },
    select: { id: true, fullName: true, sellerProfile: { select: { id: true } } },
  });
  if (!seller?.sellerProfile) throw new Error("Seller / profile not found");

  // ── Fetch all PENDING_REVIEW drafts ───────────────────────────────────────
  const drafts = await prisma.catalogProductDraft.findMany({
    where:   { sellerProfileId: seller.sellerProfile.id, status: "PENDING_REVIEW" },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${drafts.length} PENDING_REVIEW draft(s) for ${seller.fullName}\n`);
  if (drafts.length === 0) { console.log("Nothing to approve."); return; }

  // ── Approve each ──────────────────────────────────────────────────────────
  for (const draft of drafts) {
    const label = `${draft.brand} ${draft.modelName}${draft.partName ? " " + draft.partName : ""} [${(draft as any).categoryType}]`;
    process.stdout.write(`  Approving: ${label} … `);

    await prisma.$transaction(async (tx) => {
      // 1. SellerProduct snapshot
      const sp = await tx.sellerProduct.create({
        data: {
          draftId:         draft.id,
          sellerProfileId: draft.sellerProfileId,
          categoryId:      (draft as any).categoryId ?? null,
          brand:           draft.brand,
          modelName:       draft.modelName,
          partName:        draft.partName,
          partNumber:      draft.partNumber,
          condition:       draft.condition,
          sellerPrice:     draft.price,
          quantity:        draft.quantity,
          description:     draft.description,
          imageUrls:       draft.imageUrls,
          status:          "ACTIVE",
          approvedById:    admin.id,
          approvedAt:      new Date(),
        },
      });

      // 2. Stub LiveProduct (DRAFT) ready for enrichment
      const slug = generateSlug(draft.brand, draft.modelName, draft.partName, sp.id);
      await tx.liveProduct.create({
        data: {
          sellerProductId: sp.id,
          title:           `${draft.brand} ${draft.modelName}${draft.partName ? " " + draft.partName : ""}`,
          slug,
          description:     draft.description ?? "",
          specs:           [],
          imageUrls:       draft.imageUrls,
          listingPrice:    draft.price,
          status:          "DRAFT",
          enrichedById:    admin.id,
        },
      });

      // 3. Mark draft APPROVED
      await tx.catalogProductDraft.update({
        where: { id: draft.id },
        data:  { status: "APPROVED", reviewedAt: new Date(), reviewedById: admin.id },
      });

      // 4. Notify seller
      await tx.notification.create({
        data: {
          userId:  seller.id,
          type:    "DRAFT_APPROVED" as any,
          title:   "Product approved!",
          message: `Your listing "${draft.brand} ${draft.modelName}${draft.partName ? " " + draft.partName : ""}" has been approved and is being prepared for the marketplace.`,
          metadata: { draftId: draft.id, sellerProductId: sp.id },
        },
      });
    });

    console.log("✓");
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const remaining = await prisma.catalogProductDraft.count({
    where: { sellerProfileId: seller.sellerProfile.id, status: "PENDING_REVIEW" },
  });
  const approved = await prisma.catalogProductDraft.count({
    where: { sellerProfileId: seller.sellerProfile.id, status: "APPROVED" },
  });
  const sellerProducts = await prisma.sellerProduct.count({
    where: { sellerProfileId: seller.sellerProfile.id },
  });

  console.log(`
✓ All done.
  Approved drafts : ${approved}
  Seller products : ${sellerProducts}
  Still pending   : ${remaining}
  Seller notified : ${drafts.length} DRAFT_APPROVED notification(s) created
`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
