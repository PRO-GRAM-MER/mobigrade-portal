import { db } from "@/lib/db"

// ── Brand + Phone lookups (public / shared) ───────────────────────────────

export async function getBrandsForPhones() {
  return db.brand.findMany({
    where: { phones: { some: { isActive: true } } },
    select: { id: true, name: true, logoUrl: true, type: true },
    orderBy: { name: "asc" },
  })
}

export async function getAllBrands() {
  return db.brand.findMany({
    select: { id: true, name: true, logoUrl: true, type: true },
    orderBy: { name: "asc" },
  })
}

export async function getPhonesByBrand(brandId: string) {
  return db.phone.findMany({
    where: { brandId, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      launchYear: true,
      brand: { select: { id: true, name: true } },
      variants: {
        select: { id: true, ram: true, storage: true, color: true, colorHex: true },
        orderBy: [{ ram: "asc" }, { storage: "asc" }, { color: "asc" }],
      },
    },
    orderBy: { name: "asc" },
  })
}

export async function getVariantsByPhone(phoneId: string) {
  return db.phoneVariant.findMany({
    where: { phoneId },
    select: {
      id: true,
      ram: true,
      storage: true,
      color: true,
      colorHex: true,
      _count: { select: { listings: true } },
    },
    orderBy: [{ ram: "asc" }, { storage: "asc" }, { color: "asc" }],
  })
}

// ── Admin catalog management ──────────────────────────────────────────────

export async function getAdminPhonesList() {
  const phones = await db.phone.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      launchYear: true,
      isActive: true,
      createdAt: true,
      brand: { select: { id: true, name: true } },
      _count: { select: { variants: true } },
      images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
    },
    orderBy: [{ brand: { name: "asc" } }, { name: "asc" }],
  })
  return phones
}

export async function getAdminPhoneDetail(phoneId: string) {
  return db.phone.findUnique({
    where: { id: phoneId },
    select: {
      id: true,
      name: true,
      slug: true,
      launchYear: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      brand: { select: { id: true, name: true } },
      variants: {
        select: {
          id: true, ram: true, storage: true, color: true, colorHex: true, createdAt: true,
          _count: { select: { listings: { where: { status: "ACTIVE" } } } },
          listings: {
            select: { price: true, stock: true, status: true },
            where: { status: "ACTIVE" },
          },
        },
        orderBy: [{ ram: "asc" }, { storage: "asc" }, { color: "asc" }],
      },
      specification: true,
      images: { select: { id: true, url: true, altText: true, isPrimary: true, order: true }, orderBy: { order: "asc" } },
    },
  })
}

export async function findOrCreateVariant(
  phoneId: string,
  ram: number,
  storage: number,
  color: string, // already normalized
  colorHex?: string | null,
) {
  const existing = await db.phoneVariant.findUnique({
    where: { phoneId_ram_storage_color: { phoneId, ram, storage, color } },
  })
  if (existing) return existing

  return db.phoneVariant.create({
    data: { phoneId, ram, storage, color, colorHex: colorHex ?? null },
  })
}
