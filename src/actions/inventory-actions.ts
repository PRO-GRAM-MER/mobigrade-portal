"use server";

import { auth }           from "@/auth";
import { prisma }         from "@/lib/prisma";
import { revalidatePath } from "next/cache";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");
  return session;
}

export interface EnrichData {
  title:        string;
  slug:         string;
  description:  string;
  highlights:   string[];
  listingPrice: number;
  imageUrls:    string[];
  specs:        { key: string; value: string }[];
}

// ─── Enrich SellerProduct → create/update LiveProduct ─────────────────────────

export async function enrichSellerProductAction(
  sellerProductId: string,
  data: EnrichData
): Promise<ActionResult<{ liveProductId: string }>> {
  try {
    const session = await requireAdmin();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sp = await (prisma.sellerProduct as any).findUnique({
      where:   { id: sellerProductId },
      include: { liveProduct: { select: { id: true } } },
    });
    if (!sp) return { success: false, error: "Seller product not found" };

    let liveProductId: string;

    if (sp.liveProduct) {
      // Update existing LiveProduct
      await (prisma.liveProduct as any).update({  // eslint-disable-line @typescript-eslint/no-explicit-any
        where: { id: sp.liveProduct.id },
        data: {
          title:        data.title.trim(),
          slug:         data.slug.trim(),
          description:  data.description.trim(),
          highlights:   data.highlights.filter(Boolean),
          specs:        data.specs.filter((s) => s.key.trim() && s.value.trim()),
          imageUrls:    data.imageUrls.filter(Boolean),
          listingPrice: data.listingPrice,
          enrichedById: session.user.id,
        },
      });
      liveProductId = sp.liveProduct.id;
    } else {
      // Slug uniqueness check
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const slugConflict = await (prisma.liveProduct as any).findUnique({ where: { slug: data.slug.trim() } });
      if (slugConflict) return { success: false, error: `Slug "${data.slug}" is already taken` };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const liveProduct = await (prisma.liveProduct as any).create({
        data: {
          sellerProductId,
          title:        data.title.trim(),
          slug:         data.slug.trim(),
          description:  data.description.trim(),
          highlights:   data.highlights.filter(Boolean),
          specs:        data.specs.filter((s) => s.key.trim() && s.value.trim()),
          imageUrls:    data.imageUrls.filter(Boolean),
          listingPrice: data.listingPrice,
          enrichedById: session.user.id,
          status:       "DRAFT",
        },
      });
      liveProductId = liveProduct.id;
    }

    // Mark SellerProduct status based on LiveProduct status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma.sellerProduct as any).update({
      where: { id: sellerProductId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data:  { status: "ENRICHING" as any },
    });

    revalidatePath("/admin/our-inventory", "layout");
    revalidatePath("/admin/website", "layout");

    return { success: true, data: { liveProductId } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Enrich failed" };
  }
}

// ─── Toggle LiveProduct publish status ────────────────────────────────────────

export async function toggleLiveProductPublishAction(
  liveProductId: string
): Promise<ActionResult<{ status: string }>> {
  try {
    await requireAdmin();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lp = await (prisma.liveProduct as any).findUnique({ where: { id: liveProductId } });
    if (!lp) return { success: false, error: "Live product not found" };

    const newStatus = lp.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma.liveProduct as any).update({
      where: { id: liveProductId },
      data:  {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status:      newStatus as any,
        publishedAt: newStatus === "PUBLISHED" ? new Date() : null,
      },
    });

    // Sync SellerProduct status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma.sellerProduct as any).update({
      where: { id: lp.sellerProductId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data:  { status: newStatus === "PUBLISHED" ? ("LIVE" as any) : ("ENRICHING" as any) },
    });

    revalidatePath("/admin/website");
    revalidatePath("/admin/our-inventory");

    return { success: true, data: { status: newStatus } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
