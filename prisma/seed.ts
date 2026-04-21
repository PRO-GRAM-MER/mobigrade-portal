// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaNeon } = require("@prisma/adapter-neon");
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv/config");

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ─── Spare Part Categories ────────────────────────────────────────────────────

const SPARE_PART_CATEGORIES = [
  { name: "Display Assembly",           slug: "display-assembly",    sortOrder: 1  },
  { name: "Battery",                    slug: "battery",             sortOrder: 2  },
  { name: "Back Panel / Housing",       slug: "back-panel",          sortOrder: 3  },
  { name: "Camera Module",              slug: "camera-module",       sortOrder: 4  },
  { name: "Charging Port / Flex",       slug: "charging-port",       sortOrder: 5  },
  { name: "Speaker / Earpiece",         slug: "speaker-earpiece",    sortOrder: 6  },
  { name: "Motherboard",                slug: "motherboard",         sortOrder: 7  },
  { name: "SIM Tray",                   slug: "sim-tray",            sortOrder: 8  },
  { name: "Volume / Power Buttons",     slug: "volume-power-buttons",sortOrder: 9  },
  { name: "Front Camera",               slug: "front-camera",        sortOrder: 10 },
  { name: "Rear Camera",                slug: "rear-camera",         sortOrder: 11 },
  { name: "Microphone / Headphone Jack",slug: "audio-components",    sortOrder: 12 },
  { name: "Charging IC / PMIC",         slug: "charging-ic",         sortOrder: 13 },
  { name: "Touch Digitizer",            slug: "touch-digitizer",     sortOrder: 14 },
  { name: "Other",                      slug: "other",               sortOrder: 99 },
];

// ─── Brands + Models ──────────────────────────────────────────────────────────

type BrandSeed = { name: string; slug: string; sortOrder: number; models: string[] };

const BRANDS: BrandSeed[] = [
  {
    name: "Samsung", slug: "samsung", sortOrder: 1,
    models: [
      "Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24", "Galaxy S23 Ultra",
      "Galaxy S23+", "Galaxy S23", "Galaxy S22 Ultra", "Galaxy S22+", "Galaxy S22",
      "Galaxy A55", "Galaxy A35", "Galaxy A25", "Galaxy A15", "Galaxy A54", "Galaxy A34",
      "Galaxy M34", "Galaxy M14", "Galaxy F15", "Galaxy F54",
      "Galaxy Z Fold 5", "Galaxy Z Flip 5",
    ],
  },
  {
    name: "Apple", slug: "apple", sortOrder: 2,
    models: [
      "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15",
      "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14",
      "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13 Mini", "iPhone 13",
      "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12 Mini", "iPhone 12",
      "iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11",
      "iPhone SE (3rd Gen)", "iPhone SE (2nd Gen)",
    ],
  },
  {
    name: "OnePlus", slug: "oneplus", sortOrder: 3,
    models: [
      "OnePlus 12", "OnePlus 12R", "OnePlus 11", "OnePlus 11R",
      "OnePlus 10 Pro", "OnePlus 10T", "OnePlus 9 Pro", "OnePlus 9",
      "OnePlus Nord CE 4", "OnePlus Nord CE 3 Lite", "OnePlus Nord CE 3",
      "OnePlus Nord 4", "OnePlus Nord 3", "OnePlus Nord 2T",
      "OnePlus Open",
    ],
  },
  {
    name: "Xiaomi", slug: "xiaomi", sortOrder: 4,
    models: [
      "Xiaomi 14 Ultra", "Xiaomi 14", "Xiaomi 13 Pro", "Xiaomi 13",
      "Redmi Note 13 Pro+", "Redmi Note 13 Pro", "Redmi Note 13",
      "Redmi Note 12 Pro+", "Redmi Note 12 Pro", "Redmi Note 12",
      "Redmi 13C", "Redmi 12", "Redmi 12C", "Redmi A3", "Redmi A2+",
      "POCO X6 Pro", "POCO X6", "POCO F6 Pro", "POCO F6", "POCO M6 Pro",
    ],
  },
  {
    name: "Vivo", slug: "vivo", sortOrder: 5,
    models: [
      "Vivo X100 Pro", "Vivo X100", "Vivo X90 Pro", "Vivo X90",
      "Vivo V30 Pro", "Vivo V30", "Vivo V29 Pro", "Vivo V29",
      "Vivo Y200 Pro", "Vivo Y200", "Vivo Y100", "Vivo Y28",
      "Vivo T3 Pro", "Vivo T3", "Vivo T2 Pro", "Vivo T2",
    ],
  },
  {
    name: "OPPO", slug: "oppo", sortOrder: 6,
    models: [
      "OPPO Find X7 Ultra", "OPPO Find X7", "OPPO Find X6 Pro", "OPPO Find X6",
      "OPPO Reno 12 Pro", "OPPO Reno 12", "OPPO Reno 11 Pro", "OPPO Reno 11",
      "OPPO A3 Pro", "OPPO A60", "OPPO A18", "OPPO A58",
      "OPPO F27 Pro+", "OPPO F25 Pro", "OPPO F23",
    ],
  },
  {
    name: "Realme", slug: "realme", sortOrder: 7,
    models: [
      "Realme GT 6", "Realme GT 5 Pro", "Realme GT Neo 6",
      "Realme 13 Pro+", "Realme 13 Pro", "Realme 13",
      "Realme Narzo 70 Pro", "Realme Narzo 70", "Realme Narzo 60 Pro",
      "Realme C67", "Realme C55", "Realme C53",
    ],
  },
  {
    name: "Motorola", slug: "motorola", sortOrder: 8,
    models: [
      "Motorola Edge 50 Ultra", "Motorola Edge 50 Pro", "Motorola Edge 50",
      "Motorola Edge 40 Pro", "Motorola Edge 40 Neo", "Motorola Edge 40",
      "Motorola G85", "Motorola G73", "Motorola G64", "Motorola G54",
      "Motorola G34", "Motorola G24", "Motorola G14",
      "Razr 50 Ultra", "Razr 50",
    ],
  },
  {
    name: "iQOO", slug: "iqoo", sortOrder: 9,
    models: [
      "iQOO 12", "iQOO 11s", "iQOO 11",
      "iQOO Neo 9 Pro", "iQOO Neo 9", "iQOO Neo 7 Pro", "iQOO Neo 7",
      "iQOO Z9 Pro", "iQOO Z9", "iQOO Z9x",
      "iQOO Z7 Pro", "iQOO Z7",
    ],
  },
  {
    name: "Nothing", slug: "nothing", sortOrder: 10,
    models: [
      "Nothing Phone 2a Plus", "Nothing Phone 2a", "Nothing Phone 2", "Nothing Phone 1",
      "Nothing CMF Phone 1",
    ],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Spare-part sub-categories
  console.log("Seeding spare part categories…");
  for (const cat of SPARE_PART_CATEGORIES) {
    await prisma.sparePartCategory.upsert({
      where:  { slug: cat.slug },
      update: { name: cat.name, sortOrder: cat.sortOrder },
      create: cat,
    });
  }
  console.log(`✓ ${SPARE_PART_CATEGORIES.length} spare-part categories`);

  // 2. Brands + Models
  console.log("Seeding brands and models…");
  let modelCount = 0;

  for (const brand of BRANDS) {
    const brandRecord = await prisma.brand.upsert({
      where:  { slug: brand.slug },
      update: { name: brand.name, sortOrder: brand.sortOrder },
      create: { name: brand.name, slug: brand.slug, sortOrder: brand.sortOrder },
    });

    for (let i = 0; i < brand.models.length; i++) {
      const modelName = brand.models[i];
      const modelSlug = modelName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      await prisma.model.upsert({
        where:  { brandId_name: { brandId: brandRecord.id, name: modelName } },
        update: { sortOrder: i },
        create: {
          brandId:   brandRecord.id,
          name:      modelName,
          slug:      modelSlug,
          sortOrder: i,
        },
      });
      modelCount++;
    }
  }
  console.log(`✓ ${BRANDS.length} brands, ${modelCount} models`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
