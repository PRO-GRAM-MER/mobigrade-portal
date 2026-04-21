/**
 * Seed script: creates one manual draft + one CSV batch draft for each category
 * for the verified seller emp1@gmail.com.
 * Run: npx tsx scripts/seed-test-drafts.ts
 */

import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter } as any);

async function main() {
  // ── 1. Find seller ──────────────────────────────────────────────────────────
  const user = await prisma.user.findUnique({
    where: { email: "emp1@gmail.com" },
    select: {
      id: true,
      fullName: true,
      verificationStatus: true,
      role: true,
      sellerProfile: { select: { id: true } },
    },
  });

  if (!user) throw new Error("User emp1@gmail.com not found");
  if (!user.sellerProfile) throw new Error("Seller profile not found for emp1@gmail.com");
  if (user.verificationStatus !== "KYC_APPROVED") throw new Error(`Seller KYC is ${user.verificationStatus}, not KYC_APPROVED`);

  console.log(`\n✓ Found seller: ${user.fullName} (${user.verificationStatus})`);
  console.log(`  Profile ID: ${user.sellerProfile.id}\n`);

  const sellerProfileId = user.sellerProfile.id;

  // ── 2. Get first Brand + Model for all categories ─────────────────────────
  const brand = await prisma.brand.findFirst({ orderBy: { name: "asc" } });
  if (!brand) throw new Error("No brands seeded. Run: npx tsx prisma/seed.ts");

  const model = await prisma.model.findFirst({
    where: { brandId: brand.id },
    orderBy: { name: "asc" },
  });
  if (!model) throw new Error("No models seeded");

  console.log(`  Using brand: ${brand.name} | model: ${model.name}\n`);

  // ── 3. Category definitions ──────────────────────────────────────────────
  type CategoryType = "SPARE_PARTS" | "VRP" | "NEW_PHONES" | "PREXO" | "OPEN_BOX";

  const categories: {
    slug:         string;
    label:        string;
    categoryType: CategoryType;
    manualSpecs:  Record<string, unknown>;
    csvHeaders:   string;
    csvRow:       string;
  }[] = [
    {
      slug:         "spare-parts",
      label:        "Spare Parts",
      categoryType: "SPARE_PARTS",
      manualSpecs: {
        brand:       brand.name,
        model_name:  model.name,
        part_name:   "Display Assembly",
        condition:   "OEM",
        price:       850,
        quantity:    20,
        description: "OEM display assembly for testing",
      },
      csvHeaders: "brand,model_name,part_name,condition,price,quantity,description",
      csvRow:     `${brand.name},${model.name},Battery,NEW,450,15,CSV batch spare part`,
    },
    {
      slug:         "vrp",
      label:        "VRP",
      categoryType: "VRP",
      manualSpecs: {
        brand:          brand.name,
        model_name:     model.name,
        storage:        "128GB",
        ram:            "8GB",
        color:          "Black",
        grade:          "A",
        price:          12000,
        quantity:       5,
        description:    "Value refurbished phone for testing",
      },
      csvHeaders: "brand,model_name,storage,ram,color,grade,price,quantity,description",
      csvRow:     `${brand.name},${model.name},64GB,6GB,Blue,B,9500,3,CSV batch VRP`,
    },
    {
      slug:         "new-phones",
      label:        "New Phones",
      categoryType: "NEW_PHONES",
      manualSpecs: {
        brand:       brand.name,
        model_name:  model.name,
        storage:     "256GB",
        ram:         "12GB",
        color:       "White",
        price:       32000,
        quantity:    8,
        description: "Brand new phone for testing",
      },
      csvHeaders: "brand,model_name,storage,ram,color,price,quantity,description",
      csvRow:     `${brand.name},${model.name},128GB,8GB,Black,28000,4,CSV batch new phone`,
    },
    {
      slug:         "prexo",
      label:        "PREXO",
      categoryType: "PREXO",
      manualSpecs: {
        brand:          brand.name,
        model_name:     model.name,
        storage:        "128GB",
        ram:            "6GB",
        color:          "Gold",
        grade:          "B",
        exchange_price: 7000,
        price:          8500,
        quantity:       10,
        description:    "PREXO phone for testing",
      },
      csvHeaders: "brand,model_name,storage,ram,color,grade,exchange_price,price,quantity,description",
      csvRow:     `${brand.name},${model.name},64GB,4GB,Silver,C,5000,6500,6,CSV batch PREXO`,
    },
    {
      slug:         "open-box",
      label:        "Open Box",
      categoryType: "OPEN_BOX",
      manualSpecs: {
        brand:       brand.name,
        model_name:  model.name,
        storage:     "128GB",
        ram:         "8GB",
        color:       "Green",
        price:       18000,
        quantity:    3,
        description: "Open box phone for testing",
      },
      csvHeaders: "brand,model_name,storage,ram,color,price,quantity,description",
      csvRow:     `${brand.name},${model.name},64GB,4GB,Purple,15000,2,CSV batch open box`,
    },
  ];

  // ── 4. Output dir for CSV files ───────────────────────────────────────────
  const csvDir = path.join(process.cwd(), "scripts", "test-csvs");
  fs.mkdirSync(csvDir, { recursive: true });

  // ── 5. Process each category ─────────────────────────────────────────────
  for (const cat of categories) {
    console.log(`─── ${cat.label} ─────────────────────────────────`);

    // 5a. Manual draft
    const manualSpecs = cat.manualSpecs;
    const manualDraft = await prisma.catalogProductDraft.create({
      data: {
        sellerProfileId,
        categoryType:  cat.categoryType,
        brand:         String(manualSpecs.brand),
        modelName:     String(manualSpecs.model_name),
        partName:      cat.slug === "spare-parts" ? String(manualSpecs.part_name ?? "") : null,
        condition:     cat.slug === "spare-parts" ? (manualSpecs.condition as any) : null,
        price:         Number(manualSpecs.price),
        quantity:      Number(manualSpecs.quantity),
        description:   manualSpecs.description ? String(manualSpecs.description) : null,
        specs:         manualSpecs as any,
        status:        "PENDING_REVIEW",
      },
    });
    console.log(`  ✓ Manual draft created  | ID: ${manualDraft.id}`);

    // 5b. Write CSV file
    const csvContent = `${cat.csvHeaders}\n${cat.csvRow}\n`;
    const csvPath = path.join(csvDir, `${cat.slug}.csv`);
    fs.writeFileSync(csvPath, csvContent, "utf-8");
    console.log(`  ✓ CSV written           | ${csvPath}`);

    // 5c. Create upload batch + draft from CSV row
    const batch = await prisma.catalogUploadBatch.create({
      data: {
        sellerProfileId,
        filename:  `${cat.slug}.csv`,
        status:    "SUBMITTED",
        totalRows: 1,
        validRows: 1,
        errorRows: 0,
      },
    });

    const csvFields: Record<string, string> = {};
    const headers = cat.csvHeaders.split(",");
    const values  = cat.csvRow.split(",");
    headers.forEach((h, i) => (csvFields[h.trim()] = values[i]?.trim() ?? ""));

    await prisma.catalogProductDraft.create({
      data: {
        sellerProfileId,
        batchId:      batch.id,
        categoryType: cat.categoryType,
        brand:        csvFields.brand ?? brand.name,
        modelName:    csvFields.model_name ?? model.name,
        partName:     cat.slug === "spare-parts" ? (csvFields.part_name ?? null) : null,
        condition:    cat.slug === "spare-parts" ? (csvFields.condition as any ?? null) : null,
        price:        Number(csvFields.price ?? 0),
        quantity:     Number(csvFields.quantity ?? 0),
        description:  csvFields.description ?? null,
        specs:        csvFields as any,
        rowNumber:    1,
        status:       "PENDING_REVIEW",
      },
    });

    // 5d. Notify all admins (DRAFT_SUBMITTED)
    const adminUsers = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    if (adminUsers.length > 0) {
      await prisma.notification.createMany({
        data: adminUsers.map((admin) => ({
          userId:   admin.id,
          type:     "DRAFT_SUBMITTED" as any,
          title:    `New ${cat.label} batch pending review`,
          message:  `${user.fullName} submitted a ${cat.label} CSV batch with 1 listing ready for review.`,
          metadata: { batchId: batch.id },
        })),
      });
    }

    console.log(`  ✓ CSV batch + draft     | Batch: ${batch.id}`);
    console.log(`  ✓ Admin notified        | ${adminUsers.length} admin(s)\n`);
  }

  // ── 6. Summary ────────────────────────────────────────────────────────────
  const totalDrafts = await prisma.catalogProductDraft.count({
    where: { sellerProfileId, status: "PENDING_REVIEW" },
  });
  console.log(`\n✓ Done. Total PENDING_REVIEW drafts for ${user.fullName}: ${totalDrafts}`);
  console.log(`  CSV files saved to: scripts/test-csvs/\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
