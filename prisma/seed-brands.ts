import { PrismaClient } from "../src/generated/prisma/client"
import { neonConfig } from "@neondatabase/serverless"
import { PrismaNeon } from "@prisma/adapter-neon"
import ws from "ws"

neonConfig.webSocketConstructor = ws

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL ?? "postgresql://neondb_owner:npg_PUCTF4dIuWA0@ep-long-bar-a1qrgbvn-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
})
const db = new PrismaClient({ adapter })

// ─── PREMIUM — Tier A: Full coverage 2018–2025 ───────────────────────────────

const PREMIUM_BRANDS = [
  {
    name: "Samsung",
    models: [
      // S series
      "Galaxy S10e", "Galaxy S10", "Galaxy S10+",
      "Galaxy S20", "Galaxy S20+", "Galaxy S20 Ultra", "Galaxy S20 FE",
      "Galaxy S21", "Galaxy S21+", "Galaxy S21 Ultra", "Galaxy S21 FE",
      "Galaxy S22", "Galaxy S22+", "Galaxy S22 Ultra",
      "Galaxy S23", "Galaxy S23+", "Galaxy S23 Ultra", "Galaxy S23 FE",
      "Galaxy S24", "Galaxy S24+", "Galaxy S24 Ultra", "Galaxy S24 FE",
      "Galaxy S25", "Galaxy S25+", "Galaxy S25 Ultra",
      // Note series
      "Galaxy Note 9", "Galaxy Note 10", "Galaxy Note 10+",
      "Galaxy Note 20", "Galaxy Note 20 Ultra",
      // Z series
      "Galaxy Z Fold 2", "Galaxy Z Fold 3", "Galaxy Z Fold 4", "Galaxy Z Fold 5", "Galaxy Z Fold 6",
      "Galaxy Z Flip 3", "Galaxy Z Flip 4", "Galaxy Z Flip 5", "Galaxy Z Flip 6",
      // A series
      "Galaxy A10", "Galaxy A10s",
      "Galaxy A20", "Galaxy A20s",
      "Galaxy A30", "Galaxy A30s",
      "Galaxy A50", "Galaxy A50s",
      "Galaxy A51", "Galaxy A52", "Galaxy A52s", "Galaxy A53", "Galaxy A54", "Galaxy A55",
      "Galaxy A70", "Galaxy A71", "Galaxy A72", "Galaxy A73", "Galaxy A74",
      "Galaxy A31", "Galaxy A32", "Galaxy A33", "Galaxy A34", "Galaxy A35",
      "Galaxy A13", "Galaxy A14", "Galaxy A15",
      "Galaxy A23", "Galaxy A24", "Galaxy A25",
      "Galaxy A03", "Galaxy A03s", "Galaxy A04", "Galaxy A04s", "Galaxy A05", "Galaxy A05s", "Galaxy A06",
      // M series
      "Galaxy M10", "Galaxy M20", "Galaxy M30", "Galaxy M30s",
      "Galaxy M31", "Galaxy M31s", "Galaxy M32", "Galaxy M33", "Galaxy M34",
      "Galaxy M51", "Galaxy M52", "Galaxy M53", "Galaxy M54",
      "Galaxy M21", "Galaxy M22", "Galaxy M23",
      "Galaxy M12", "Galaxy M13", "Galaxy M14", "Galaxy M15",
      "Galaxy M62",
      // F series
      "Galaxy F41", "Galaxy F62",
      "Galaxy F13", "Galaxy F14", "Galaxy F15",
      "Galaxy F23", "Galaxy F34", "Galaxy F54",
    ],
  },
  {
    name: "Apple",
    models: [
      "iPhone X", "iPhone XR", "iPhone XS", "iPhone XS Max",
      "iPhone 11", "iPhone 11 Pro", "iPhone 11 Pro Max",
      "iPhone 12", "iPhone 12 Mini", "iPhone 12 Pro", "iPhone 12 Pro Max",
      "iPhone 13", "iPhone 13 Mini", "iPhone 13 Pro", "iPhone 13 Pro Max",
      "iPhone 14", "iPhone 14 Plus", "iPhone 14 Pro", "iPhone 14 Pro Max",
      "iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max",
      "iPhone 16", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 16 Pro Max",
    ],
  },
  {
    name: "Xiaomi",
    models: [
      // Redmi Note
      "Redmi Note 7", "Redmi Note 8", "Redmi Note 8 Pro",
      "Redmi Note 9", "Redmi Note 9 Pro", "Redmi Note 9 Pro Max", "Redmi Note 9s",
      "Redmi Note 10", "Redmi Note 10 Pro", "Redmi Note 10 Pro Max", "Redmi Note 10s", "Redmi Note 10T",
      "Redmi Note 11", "Redmi Note 11 Pro", "Redmi Note 11 Pro+", "Redmi Note 11s", "Redmi Note 11T",
      "Redmi Note 12", "Redmi Note 12 Pro", "Redmi Note 12 Pro+", "Redmi Note 12 Turbo", "Redmi Note 12s",
      "Redmi Note 13", "Redmi Note 13 Pro", "Redmi Note 13 Pro+",
      // Redmi
      "Redmi 8", "Redmi 8A",
      "Redmi 9", "Redmi 9A", "Redmi 9C", "Redmi 9i",
      "Redmi 10", "Redmi 10A", "Redmi 10C",
      "Redmi 12", "Redmi 12C",
      "Redmi 13", "Redmi 13C",
      // Mi
      "Mi 10", "Mi 10 Pro", "Mi 10T", "Mi 10T Pro",
      "Mi 11", "Mi 11X", "Mi 11X Pro", "Mi 11T", "Mi 11T Pro",
      // Xiaomi numbered
      "Xiaomi 12", "Xiaomi 12 Pro", "Xiaomi 12T", "Xiaomi 12T Pro",
      "Xiaomi 13", "Xiaomi 13 Pro", "Xiaomi 13T", "Xiaomi 13T Pro",
      "Xiaomi 14", "Xiaomi 14 Pro", "Xiaomi 14T", "Xiaomi 14T Pro",
      // POCO
      "POCO F1", "POCO F2 Pro", "POCO F3", "POCO F4", "POCO F4 GT", "POCO F5", "POCO F5 Pro", "POCO F6", "POCO F6 Pro",
      "POCO X2", "POCO X3", "POCO X3 Pro", "POCO X3 GT", "POCO X4", "POCO X4 Pro", "POCO X4 GT",
      "POCO X5", "POCO X5 Pro", "POCO X6", "POCO X6 Pro", "POCO X6 Neo",
      "POCO M2", "POCO M2 Pro", "POCO M3", "POCO M3 Pro", "POCO M4", "POCO M4 Pro", "POCO M5", "POCO M5s", "POCO M6",
      "POCO C40", "POCO C50", "POCO C55", "POCO C65",
    ],
  },
  {
    name: "Vivo",
    models: [
      // V series
      "Vivo V15 Pro", "Vivo V17", "Vivo V17 Pro",
      "Vivo V19", "Vivo V19 Pro",
      "Vivo V20", "Vivo V20 Pro", "Vivo V20 SE",
      "Vivo V21", "Vivo V21e",
      "Vivo V23", "Vivo V23e", "Vivo V23 5G",
      "Vivo V25", "Vivo V25e", "Vivo V25 Pro",
      "Vivo V27", "Vivo V27e", "Vivo V27 Pro",
      "Vivo V29", "Vivo V29e", "Vivo V29 Pro",
      "Vivo V30", "Vivo V30 Lite", "Vivo V30 Pro", "Vivo V30e",
      "Vivo V40", "Vivo V40 Lite", "Vivo V40 Pro",
      // Y series
      "Vivo Y12", "Vivo Y12s", "Vivo Y15", "Vivo Y15s", "Vivo Y17",
      "Vivo Y20", "Vivo Y20A", "Vivo Y20G", "Vivo Y20i", "Vivo Y20T",
      "Vivo Y21", "Vivo Y21A", "Vivo Y21e", "Vivo Y21T",
      "Vivo Y22", "Vivo Y22s",
      "Vivo Y27", "Vivo Y27s", "Vivo Y28",
      "Vivo Y33s", "Vivo Y33T", "Vivo Y35", "Vivo Y36",
      "Vivo Y51", "Vivo Y53s",
      "Vivo Y72", "Vivo Y73", "Vivo Y75", "Vivo Y76", "Vivo Y78",
      "Vivo Y100", "Vivo Y200",
      // T series
      "Vivo T1", "Vivo T1 Pro", "Vivo T1x", "Vivo T1 5G",
      "Vivo T2", "Vivo T2 Pro", "Vivo T2x",
      "Vivo T3", "Vivo T3 Pro", "Vivo T3 Ultra",
      // X series
      "Vivo X50", "Vivo X50 Pro",
      "Vivo X60", "Vivo X60 Pro",
      "Vivo X70", "Vivo X70 Pro",
      "Vivo X80", "Vivo X80 Pro",
      "Vivo X90", "Vivo X90 Pro",
      "Vivo X100", "Vivo X100 Pro",
    ],
  },
  {
    name: "OPPO",
    models: [
      // A series
      "OPPO A5 2020", "OPPO A9 2020",
      "OPPO A12", "OPPO A15", "OPPO A15s", "OPPO A16", "OPPO A16s", "OPPO A16k", "OPPO A17", "OPPO A17k", "OPPO A18",
      "OPPO A31", "OPPO A33",
      "OPPO A52", "OPPO A53", "OPPO A53s", "OPPO A54", "OPPO A54s", "OPPO A55",
      "OPPO A57", "OPPO A57e", "OPPO A57s", "OPPO A58",
      "OPPO A72", "OPPO A74", "OPPO A74 5G", "OPPO A76", "OPPO A77", "OPPO A77s",
      "OPPO A78", "OPPO A78 5G", "OPPO A79",
      "OPPO A91", "OPPO A92", "OPPO A93", "OPPO A95", "OPPO A96", "OPPO A98",
      "OPPO A3", "OPPO A3 Pro",
      // Reno series
      "OPPO Reno 2", "OPPO Reno 2F",
      "OPPO Reno 3", "OPPO Reno 3 Pro",
      "OPPO Reno 4", "OPPO Reno 4 Pro", "OPPO Reno 4 Lite",
      "OPPO Reno 5", "OPPO Reno 5 Pro", "OPPO Reno 5 Lite",
      "OPPO Reno 6", "OPPO Reno 6 Pro",
      "OPPO Reno 7", "OPPO Reno 7 Pro", "OPPO Reno 7Z",
      "OPPO Reno 8", "OPPO Reno 8 Pro", "OPPO Reno 8T", "OPPO Reno 8Z",
      "OPPO Reno 10", "OPPO Reno 10 Pro", "OPPO Reno 10 Pro+",
      "OPPO Reno 11", "OPPO Reno 11 Pro", "OPPO Reno 11F",
      "OPPO Reno 12", "OPPO Reno 12 Pro",
      // F series
      "OPPO F11", "OPPO F11 Pro",
      "OPPO F15", "OPPO F15 Pro",
      "OPPO F17", "OPPO F17 Pro",
      "OPPO F19", "OPPO F19 Pro", "OPPO F19 Pro+",
      "OPPO F21 Pro", "OPPO F21 Pro+",
      "OPPO F23", "OPPO F25 Pro", "OPPO F27", "OPPO F27 Pro",
      // Find X
      "OPPO Find X2", "OPPO Find X2 Pro",
      "OPPO Find X3", "OPPO Find X3 Pro",
      "OPPO Find X5", "OPPO Find X5 Pro",
      "OPPO Find X7", "OPPO Find X7 Pro",
    ],
  },
  {
    name: "Realme",
    models: [
      // Narzo
      "Realme Narzo 10", "Realme Narzo 10A",
      "Realme Narzo 20", "Realme Narzo 20A", "Realme Narzo 20 Pro",
      "Realme Narzo 30", "Realme Narzo 30A", "Realme Narzo 30 Pro",
      "Realme Narzo 50", "Realme Narzo 50A", "Realme Narzo 50A Prime", "Realme Narzo 50i", "Realme Narzo 50i Prime",
      "Realme Narzo 60", "Realme Narzo 60 Pro", "Realme Narzo 60x",
      "Realme Narzo 70", "Realme Narzo 70 Pro", "Realme Narzo 70x",
      // C series
      "Realme C1", "Realme C2", "Realme C3",
      "Realme C11", "Realme C12", "Realme C15", "Realme C17",
      "Realme C20", "Realme C20A", "Realme C21", "Realme C21Y", "Realme C25", "Realme C25s", "Realme C25Y",
      "Realme C30", "Realme C30s", "Realme C31", "Realme C33", "Realme C33s", "Realme C35",
      "Realme C51", "Realme C53", "Realme C55",
      "Realme C61", "Realme C63", "Realme C65", "Realme C67", "Realme C75",
      // Number series
      "Realme 5", "Realme 5 Pro", "Realme 5i", "Realme 5s",
      "Realme 6", "Realme 6 Pro", "Realme 6i", "Realme 6s",
      "Realme 7", "Realme 7 Pro", "Realme 7i",
      "Realme 8", "Realme 8 Pro", "Realme 8i", "Realme 8s",
      "Realme 9", "Realme 9 Pro", "Realme 9 Pro+", "Realme 9i", "Realme 9s",
      "Realme 10", "Realme 10 Pro", "Realme 10 Pro+", "Realme 10s", "Realme 10T",
      "Realme 11", "Realme 11 Pro", "Realme 11 Pro+", "Realme 11x",
      "Realme 12", "Realme 12 Pro", "Realme 12 Pro+", "Realme 12x", "Realme 12 Lite",
      // GT series
      "Realme GT", "Realme GT Neo", "Realme GT Neo 2", "Realme GT Neo 3", "Realme GT Neo 3T",
      "Realme GT 2", "Realme GT 2 Pro",
      "Realme GT 3", "Realme GT Neo 5",
      "Realme GT 5", "Realme GT 5 Pro",
      "Realme GT 6", "Realme GT 6T",
    ],
  },
  {
    name: "OnePlus",
    models: [
      // Flagship
      "OnePlus 6", "OnePlus 6T",
      "OnePlus 7", "OnePlus 7 Pro", "OnePlus 7T", "OnePlus 7T Pro",
      "OnePlus 8", "OnePlus 8 Pro", "OnePlus 8T",
      "OnePlus 9", "OnePlus 9 Pro", "OnePlus 9R", "OnePlus 9RT",
      "OnePlus 10 Pro", "OnePlus 10R", "OnePlus 10T",
      "OnePlus 11", "OnePlus 11R",
      "OnePlus 12", "OnePlus 12R",
      "OnePlus 13", "OnePlus 13R",
      "OnePlus Open",
      // Nord
      "OnePlus Nord", "OnePlus Nord 2", "OnePlus Nord 2T",
      "OnePlus Nord CE", "OnePlus Nord CE 2", "OnePlus Nord CE 2 Lite",
      "OnePlus Nord CE 3", "OnePlus Nord CE 3 Lite",
      "OnePlus Nord CE 4", "OnePlus Nord CE 4 Lite",
      "OnePlus Nord 3", "OnePlus Nord 4", "OnePlus Nord 4 SE",
    ],
  },
]

// ─── ACTIVE — Tier B: Popular models ─────────────────────────────────────────

const ACTIVE_BRANDS = [
  {
    name: "Motorola",
    models: [
      // Moto G
      "Moto G20", "Moto G22", "Moto G30", "Moto G31", "Moto G32",
      "Moto G40 Fusion", "Moto G42", "Moto G50", "Moto G51", "Moto G52",
      "Moto G53", "Moto G54", "Moto G60", "Moto G60s",
      "Moto G62", "Moto G71", "Moto G72", "Moto G82", "Moto G84", "Moto G85",
      "Moto G200", "Moto G Power", "Moto G Stylus",
      // Moto Edge
      "Moto Edge 20", "Moto Edge 20 Fusion", "Moto Edge 20 Pro",
      "Moto Edge 30", "Moto Edge 30 Fusion", "Moto Edge 30 Neo", "Moto Edge 30 Pro", "Moto Edge 30 Ultra",
      "Moto Edge 40", "Moto Edge 40 Neo", "Moto Edge 40 Pro",
      "Moto Edge 50", "Moto Edge 50 Fusion", "Moto Edge 50 Pro", "Moto Edge 50 Ultra",
      // Moto E
      "Moto E7", "Moto E7 Power", "Moto E20", "Moto E22", "Moto E30", "Moto E32", "Moto E40",
    ],
  },
  {
    name: "Nokia",
    models: [
      // C series
      "Nokia C01 Plus", "Nokia C02", "Nokia C03", "Nokia C05",
      "Nokia C11", "Nokia C12", "Nokia C21", "Nokia C21 Plus", "Nokia C31", "Nokia C32",
      // G series
      "Nokia G10", "Nokia G11", "Nokia G11 Plus", "Nokia G20", "Nokia G21", "Nokia G42", "Nokia G60", "Nokia G310",
      // X series
      "Nokia X10", "Nokia X20", "Nokia X30",
      // Number series
      "Nokia 1.3", "Nokia 2.4", "Nokia 3.4", "Nokia 4.2", "Nokia 5.4", "Nokia 6.2", "Nokia 7.2", "Nokia 8.3",
    ],
  },
  {
    name: "Asus",
    models: [
      // ROG Phone
      "Asus ROG Phone 3", "Asus ROG Phone 5", "Asus ROG Phone 5s",
      "Asus ROG Phone 6", "Asus ROG Phone 6D",
      "Asus ROG Phone 7", "Asus ROG Phone 7 Pro",
      "Asus ROG Phone 8", "Asus ROG Phone 8 Pro",
      // Zenfone
      "Asus Zenfone 8", "Asus Zenfone 9", "Asus Zenfone 10", "Asus Zenfone 11 Ultra",
    ],
  },
  {
    name: "iQOO",
    models: [
      // iQOO flagship
      "iQOO 3", "iQOO 5", "iQOO 7", "iQOO 7 Legend",
      "iQOO 9", "iQOO 9 Pro", "iQOO 9 SE", "iQOO 9T",
      "iQOO 10", "iQOO 11", "iQOO 11 Pro",
      "iQOO 12", "iQOO 12 Pro", "iQOO 13",
      // iQOO Neo
      "iQOO Neo 3", "iQOO Neo 5", "iQOO Neo 6", "iQOO Neo 6R",
      "iQOO Neo 7", "iQOO Neo 7 SE", "iQOO Neo 8", "iQOO Neo 9", "iQOO Neo 9 Pro",
      // iQOO Z
      "iQOO Z1", "iQOO Z3", "iQOO Z5",
      "iQOO Z6", "iQOO Z6 Lite", "iQOO Z7", "iQOO Z7s",
      "iQOO Z8", "iQOO Z9", "iQOO Z9 Turbo", "iQOO Z9s",
    ],
  },
]

// ─── LEGACY — Tier C: Popular old models 2015–2020 ───────────────────────────

const LEGACY_BRANDS = [
  {
    name: "Gionee",
    models: [
      // A series
      "Gionee A1", "Gionee A1 Plus", "Gionee A1 Lite",
      // F series
      "Gionee F103", "Gionee F103 Pro", "Gionee F205", "Gionee F306",
      // M series
      "Gionee M6", "Gionee M6 Mirror", "Gionee M7", "Gionee M7 Power", "Gionee M6S Plus",
      // S series
      "Gionee S6", "Gionee S6 Pro", "Gionee S6s", "Gionee S9", "Gionee S10", "Gionee S10B",
      // Marathon
      "Gionee Marathon M5", "Gionee Marathon M5 Plus",
    ],
  },
  {
    name: "Micromax",
    models: [
      // Canvas
      "Micromax Canvas 2", "Micromax Canvas 5", "Micromax Canvas 6", "Micromax Canvas 6 Pro",
      "Micromax Canvas Infinity", "Micromax Canvas Infinity Pro",
      // In series
      "Micromax In Note 1", "Micromax In Note 1B", "Micromax In Note 2",
      "Micromax In 1", "Micromax In 1b", "Micromax In 2b", "Micromax In 2c",
      // Bolt / Evok / Dual
      "Micromax Bolt Q336", "Micromax Bolt Q383", "Micromax Evok Power", "Micromax Dual 5",
    ],
  },
  {
    name: "Lava",
    models: [
      // Iris
      "Lava Iris 88", "Lava Iris 820", "Lava Iris X1",
      // Z series
      "Lava Z25", "Lava Z60s", "Lava Z61", "Lava Z80", "Lava Z90", "Lava Z91", "Lava Z92", "Lava Z93", "Lava Z93 Plus",
      // Blaze
      "Lava Blaze", "Lava Blaze Pro", "Lava Blaze X", "Lava Blaze 2",
      // Others
      "Lava A5", "Lava A71", "Lava Be Z1", "Lava Be U",
    ],
  },
  {
    name: "Intex",
    models: [
      // Aqua
      "Intex Aqua 4G", "Intex Aqua 4G+", "Intex Aqua 5.5",
      "Intex Aqua Lions T1 Plus", "Intex Aqua Lions X1 Plus",
      "Intex Aqua Power", "Intex Aqua Power II",
      "Intex Aqua Pro", "Intex Aqua Speed", "Intex Aqua Strong 5.1",
      "Intex Aqua Trend", "Intex Aqua View",
      // Cloud
      "Intex Cloud 3", "Intex Cloud Crystal", "Intex Cloud Crystal 2.5D",
      "Intex Cloud Flash", "Intex Cloud Gem", "Intex Cloud Gem Plus",
      "Intex Cloud String", "Intex Cloud X1",
      // Staari
      "Intex Staari 8", "Intex Staari 9", "Intex Staari 11",
    ],
  },
  {
    name: "Karbonn",
    models: [
      // Titanium
      "Karbonn Titanium S9", "Karbonn Titanium S15", "Karbonn Titanium S19", "Karbonn Titanium S21",
      "Karbonn Titanium S21 Plus", "Karbonn Titanium S23", "Karbonn Titanium S35",
      "Karbonn Titanium S99", "Karbonn Titanium S105", "Karbonn Titanium Mach Six",
      // Aura
      "Karbonn Aura Note 2", "Karbonn Aura Note 3",
      "Karbonn Aura Plus", "Karbonn Aura Shine", "Karbonn Aura Power",
      // K series
      "Karbonn K9 Smart", "Karbonn K9 Smart 4G", "Karbonn K9 Cavalli",
      // Quattro
      "Karbonn Quattro L50 HD", "Karbonn Quattro L52 VR",
    ],
  },
]

async function main() {
  console.log("Seeding brands and models…\n")

  const groups = [
    { type: "PREMIUM" as const, brands: PREMIUM_BRANDS },
    { type: "ACTIVE" as const, brands: ACTIVE_BRANDS },
    { type: "LEGACY" as const, brands: LEGACY_BRANDS },
  ]

  for (const group of groups) {
    console.log(`── ${group.type} ──────────────────────`)
    for (const brand of group.brands) {
      const b = await db.brand.upsert({
        where: { name: brand.name },
        update: { type: group.type },
        create: { name: brand.name, type: group.type },
      })

      for (const modelName of brand.models) {
        await db.model.upsert({
          where: { name_brandId: { name: modelName, brandId: b.id } },
          update: {},
          create: { name: modelName, brandId: b.id },
        })
      }

      console.log(`  ✓ ${brand.name} — ${brand.models.length} models`)
    }
    console.log()
  }

  console.log("Done.")
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
