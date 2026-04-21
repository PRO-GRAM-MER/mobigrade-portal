import { db } from "@/lib/db"

export async function getAdminListingSellersList() {
  const sellers = await db.user.findMany({
    where: {
      role: "SELLER",
      phoneListings: { some: {} },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      sellerProfile: { select: { businessName: true, verificationStatus: true } },
      phoneListings: {
        select: { status: true, uploadType: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  return sellers.map((s) => {
    const listings = s.phoneListings
    return {
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      phone: s.phone ?? null,
      businessName: s.sellerProfile?.businessName ?? null,
      verificationStatus: s.sellerProfile?.verificationStatus ?? "PENDING",
      totalListings: listings.length,
      pendingCount: listings.filter((l) => l.status === "PENDING_REVIEW").length,
      activeCount: listings.filter((l) => l.status === "ACTIVE").length,
      rejectedCount: listings.filter((l) => l.status === "REJECTED").length,
      csvCount: listings.filter((l) => l.uploadType === "CSV").length,
      manualCount: listings.filter((l) => l.uploadType === "MANUAL").length,
      lastUploadAt: listings[0]?.createdAt?.toISOString() ?? null,
    }
  })
}

export async function getSellerListingsForAdmin(sellerId: string) {
  const seller = await db.user.findUnique({
    where: { id: sellerId, role: "SELLER" },
    select: {
      id: true, firstName: true, lastName: true, email: true, phone: true,
      sellerProfile: { select: { businessName: true, verificationStatus: true } },
    },
  })
  if (!seller) return null

  const listings = await db.sellerPhoneListing.findMany({
    where: { sellerId },
    select: {
      id: true,
      price: true,
      stock: true,
      sku: true,
      condition: true,
      warrantyMonths: true,
      warrantyType: true,
      adminNotes: true,
      status: true,
      uploadType: true,
      deployedAt: true,
      createdAt: true,
      updatedAt: true,
      variant: {
        select: {
          id: true,
          ram: true,
          storage: true,
          color: true,
          colorHex: true,
          phone: {
            select: {
              id: true,
              name: true,
              slug: true,
              brand: { select: { id: true, name: true } },
              specification: {
                select: { chipset: true, displaySize: true, batteryMah: true },
              },
              images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
            },
          },
        },
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
    listings: listings.map((l) => ({
      ...l,
      price: Number(l.price),
      deployedAt: l.deployedAt?.toISOString() ?? null,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    })),
  }
}

export async function getAdminListingDetail(listingId: string) {
  const listing = await db.sellerPhoneListing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      price: true,
      stock: true,
      sku: true,
      condition: true,
      warrantyMonths: true,
      warrantyType: true,
      adminNotes: true,
      status: true,
      uploadType: true,
      deployedAt: true,
      createdAt: true,
      updatedAt: true,
      seller: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      variant: {
        select: {
          id: true,
          ram: true,
          storage: true,
          color: true,
          colorHex: true,
          phone: {
            select: {
              id: true,
              name: true,
              slug: true,
              launchYear: true,
              description: true,
              brand: { select: { id: true, name: true } },
              specification: true,
              images: {
                select: { id: true, url: true, altText: true, isPrimary: true, order: true },
                orderBy: { order: "asc" },
              },
            },
          },
          // min price across all active listings for this variant
          listings: {
            where: { status: "ACTIVE" },
            select: { price: true },
            orderBy: { price: "asc" },
            take: 1,
          },
        },
      },
    },
  })
  if (!listing) return null

  return {
    ...listing,
    price: Number(listing.price),
    sellerId: listing.seller.id,
    deployedAt: listing.deployedAt?.toISOString() ?? null,
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
  }
}
