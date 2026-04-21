import { db } from "@/lib/db"

export async function getAdminSellersList(search?: string) {
  const sellers = await db.user.findMany({
    where: {
      role: "SELLER",
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      sellerProfile: { select: { businessName: true, verificationStatus: true } },
      spareParts: { select: { status: true, uploadType: true, createdAt: true }, orderBy: { createdAt: "desc" } },
    },
    orderBy: { updatedAt: "desc" },
  })

  return sellers.map((s) => {
    const parts = s.spareParts
    const lastUploadAt = parts[0]?.createdAt?.toISOString() ?? null
    return {
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      phone: s.phone ?? null,
      businessName: s.sellerProfile?.businessName ?? null,
      verificationStatus: s.sellerProfile?.verificationStatus ?? "PENDING",
      totalParts: parts.length,
      pendingCount: parts.filter((p) => p.status === "PENDING_REVIEW").length,
      activeCount: parts.filter((p) => p.status === "ACTIVE").length,
      rejectedCount: parts.filter((p) => p.status === "REJECTED").length,
      csvCount: parts.filter((p) => p.uploadType === "CSV").length,
      manualCount: parts.filter((p) => p.uploadType === "MANUAL").length,
      lastUploadAt,
    }
  })
}

export async function getSellerSparePartsForAdmin(sellerId: string) {
  const seller = await db.user.findUnique({
    where: { id: sellerId, role: "SELLER" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      sellerProfile: { select: { businessName: true, verificationStatus: true } },
    },
  })
  if (!seller) return null

  const parts = await db.sparePart.findMany({
    where: { sellerId },
    select: {
      id: true,
      name: true,
      category: true,
      qualityGrade: true,
      price: true,
      discountedPrice: true,
      quantity: true,
      colors: true,
      isGenericColor: true,
      highlights: true,
      status: true,
      uploadType: true,
      enrichedAt: true,
      deployedAt: true,
      createdAt: true,
      models: {
        select: { id: true, name: true, brand: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return {
    seller: {
      id: seller.id,
      firstName: seller.firstName,
      lastName: seller.lastName,
      email: seller.email,
      phone: seller.phone ?? null,
      businessName: seller.sellerProfile?.businessName ?? null,
      verificationStatus: seller.sellerProfile?.verificationStatus ?? "PENDING",
    },
    parts: parts.map((p) => ({
      ...p,
      price: Number(p.price),
      discountedPrice: Number(p.discountedPrice),
      createdAt: p.createdAt.toISOString(),
      enrichedAt: p.enrichedAt?.toISOString() ?? null,
      deployedAt: p.deployedAt?.toISOString() ?? null,
    })),
  }
}

export async function getAdminSpareParts() {
  return db.sparePart.findMany({
    select: {
      id: true,
      name: true,
      category: true,
      qualityGrade: true,
      price: true,
      discountedPrice: true,
      quantity: true,
      status: true,
      uploadType: true,
      createdAt: true,
      seller: { select: { id: true, firstName: true, lastName: true, email: true } },
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

export async function getAdminSparePartDetail(id: string) {
  return db.sparePart.findUnique({
    where: { id },
    select: {
      id: true,
      sellerId: true,
      name: true,
      category: true,
      qualityGrade: true,
      price: true,
      discountedPrice: true,
      quantity: true,
      isGenericColor: true,
      colors: true,
      specs: true,
      productDetails: true,
      highlights: true,
      warrantyDays: true,
      returnDays: true,
      weightGrams: true,
      shortDescription: true,
      includesItems: true,
      tags: true,
      slug: true,
      adminNotes: true,
      enrichedAt: true,
      deployedAt: true,
      status: true,
      uploadType: true,
      createdAt: true,
      updatedAt: true,
      seller: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      models: {
        select: {
          id: true,
          name: true,
          brand: { select: { id: true, name: true } },
        },
      },
      images: { select: { id: true, url: true, isPrimary: true, order: true }, orderBy: { order: "asc" } },
    },
  })
}
