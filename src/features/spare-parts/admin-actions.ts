"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { adminUpdateSparePartSchema, type AdminUpdateSparePartInput } from "./schemas"
import type { ActionResult } from "@/types"
import {
  findGSMArenaUrl,
  scrapeGSMArena,
  extractCategorySpecs,
  generateHighlights,
  generateShortDescription,
  generateTags,
  generateSlug,
} from "./enrichment"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") return null
  return session
}

export async function adminUpdateSparePartAction(
  sparePartId: string,
  data: AdminUpdateSparePartInput
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, error: "Unauthorized" }

  const parsed = adminUpdateSparePartSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" }
  }

  const { name, category, qualityGrade, modelIds, price, discountedPrice, quantity, isGenericColor, colors, warrantyDays, returnDays, weightGrams, specs, shortDescription, productDetails, highlights, includesItems, tags, slug, adminNotes, status } = parsed.data

  const existing = await db.sparePart.findUnique({
    where: { id: sparePartId },
    select: { models: { select: { id: true } } },
  })
  if (!existing) return { success: false, error: "Spare part not found" }

  await db.sparePart.update({
    where: { id: sparePartId },
    data: {
      name,
      category,
      qualityGrade,
      price,
      discountedPrice,
      quantity,
      isGenericColor,
      colors: isGenericColor ? [] : colors,
      warrantyDays: warrantyDays ?? null,
      returnDays: returnDays ?? null,
      weightGrams: weightGrams ?? null,
      specs: specs && specs.length > 0 ? specs : undefined,
      shortDescription: shortDescription || null,
      productDetails: productDetails || null,
      highlights: highlights ?? [],
      includesItems: includesItems ?? [],
      tags: tags ?? [],
      slug: slug || null,
      adminNotes: adminNotes || null,
      status,
      models: {
        disconnect: existing.models.map((m) => ({ id: m.id })),
        connect: modelIds.map((id) => ({ id })),
      },
    },
  })

  revalidatePath(`/admin/marketplace/sellers/spare-parts/${sparePartId}`)
  revalidatePath("/admin/marketplace/sellers/spare-parts")
  return { success: true, message: "Spare part updated" }
}

export async function enrichSparePartAction(id: string, sellerId: string): Promise<ActionResult<{ enriched: boolean; source: string }>> {
  if (!(await requireAdmin())) return { success: false, error: "Unauthorized" }

  const part = await db.sparePart.findUnique({
    where: { id },
    select: {
      id: true,
      category: true,
      qualityGrade: true,
      models: { select: { name: true, brand: { select: { name: true } } } },
    },
  })
  if (!part) return { success: false, error: "Part not found" }
  if (part.models.length === 0) return { success: false, error: "No model linked — link a model first" }

  const brand = part.models[0].brand.name
  const modelName = part.models[0].name
  const category = part.category as string

  // All model names for tags
  const allModelNames = part.models.map((m) => m.name)

  let enriched = false
  let source = "generated"
  let categorySpecs: Record<string, string> = {}

  // Try GSM Arena
  const gsmUrl = await findGSMArenaUrl(brand, modelName)
  if (gsmUrl) {
    const allSpecs = await scrapeGSMArena(gsmUrl)
    if (allSpecs) {
      categorySpecs = extractCategorySpecs(allSpecs, category)
      enriched = true
      source = "gsmarena"
    }
  }

  const highlights = generateHighlights(categorySpecs, category, brand, modelName)
  const shortDescription = generateShortDescription(brand, modelName, category, part.qualityGrade as string)
  const tags = generateTags(brand, allModelNames, category, part.qualityGrade as string)
  const slug = generateSlug(brand, modelName, category, id)

  await db.sparePart.update({
    where: { id },
    data: {
      ...(Object.keys(categorySpecs).length > 0 ? { specs: categorySpecs } : {}),
      highlights,
      shortDescription,
      tags,
      slug,
      enrichedAt: new Date(),
    },
  })

  revalidatePath(`/admin/marketplace/sellers/spare-parts/${sellerId}/${id}`)
  revalidatePath(`/admin/marketplace/sellers/spare-parts/${sellerId}`)
  return { success: true, data: { enriched, source }, message: enriched ? `Enriched from GSM Arena` : "Generated from part info (GSM Arena unavailable)" }
}

export async function deploySparePartAction(id: string, sellerId: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, error: "Unauthorized" }

  const part = await db.sparePart.findUnique({
    where: { id },
    select: { enrichedAt: true, name: true },
  })
  if (!part) return { success: false, error: "Part not found" }
  if (!part.enrichedAt) return { success: false, error: "Enrich the part before deploying" }

  await db.sparePart.update({
    where: { id },
    data: { status: "ACTIVE", deployedAt: new Date() },
  })

  revalidatePath(`/admin/marketplace/sellers/spare-parts/${sellerId}`)
  // TODO: push to website inventory API when ready
  return { success: true, message: `"${part.name}" deployed to inventory` }
}

export async function updateSparePartStatusAction(
  id: string,
  status: "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "REJECTED",
  sellerId: string
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, error: "Unauthorized" }
  await db.sparePart.update({ where: { id }, data: { status } })
  revalidatePath(`/admin/marketplace/sellers/spare-parts/${sellerId}`)
  return { success: true, message: "Status updated" }
}

