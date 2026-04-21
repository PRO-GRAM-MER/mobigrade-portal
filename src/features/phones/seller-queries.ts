import { db } from "@/lib/db"

export async function getSellerListings(sellerId: string) {
  const listings = await db.sellerPhoneListing.findMany({
    where: { sellerId },
    select: {
      id: true,
      price: true,
      stock: true,
      sku: true,
      condition: true,
      warrantyMonths: true,
      status: true,
      uploadType: true,
      createdAt: true,
      variant: {
        select: {
          id: true,
          ram: true,
          storage: true,
          color: true,
          colorHex: true,
          phone: { select: { id: true, name: true, brand: { select: { id: true, name: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
  return listings.map((l) => ({
    ...l,
    price: Number(l.price),
    createdAt: l.createdAt.toISOString(),
  }))
}

export async function hasPendingCSVListings(sellerId: string) {
  const count = await db.sellerPhoneListing.count({
    where: { sellerId, status: "DRAFT", uploadType: "CSV" },
  })
  return count > 0
}
