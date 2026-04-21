import { db } from "@/lib/db"

export async function getBrandsWithModels() {
  return db.brand.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      models: {
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  })
}

export async function getSellerPendingCSVCount(sellerId: string) {
  return db.sparePart.count({
    where: { sellerId, uploadType: "CSV", status: "PENDING_REVIEW" },
  })
}

export async function getSellerSpareParts(sellerId: string) {
  return db.sparePart.findMany({
    where: { sellerId },
    select: {
      id: true,
      name: true,
      category: true,
      qualityGrade: true,
      status: true,
      uploadType: true,
      price: true,
      discountedPrice: true,
      quantity: true,
      createdAt: true,
      models: {
        select: {
          id: true,
          name: true,
          brand: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}
