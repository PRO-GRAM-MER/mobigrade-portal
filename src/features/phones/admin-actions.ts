"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import type { ActionResult } from "@/types"
import {
  phoneSchema, phoneSpecSchema, adminUpdateListingSchema,
  normalizeColor, type PhoneInput, type PhoneSpecInput, type AdminUpdateListingInput,
} from "./schemas"
import { findGSMArenaUrl, scrapeGSMArena } from "@/features/spare-parts/enrichment"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id || session.user.role !== "ADMIN") return null
  return session
}

// ── Phone Catalog ─────────────────────────────────────────────────────────

export async function createPhoneAction(data: PhoneInput): Promise<ActionResult<{ id: string }>> {
  if (!(await requireAdmin())) return { success: false, error: "Unauthorized" }

  const parsed = phoneSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" }

  const d = parsed.data
  const existing = await db.phone.findUnique({ where: { slug: d.slug }, select: { id: true } })
  if (existing) return { success: false, error: "Slug already taken" }

  const phone = await db.phone.create({
    data: {
      brandId: d.brandId,
      name: d.name,
      slug: d.slug,
      launchYear: d.launchYear ?? null,
      description: d.description ?? null,
      isActive: d.isActive,
    },
  })

  revalidatePath("/admin/catalog/phones")
  return { success: true, data: { id: phone.id }, message: "Phone created" }
}

export async function updatePhoneAction(phoneId: string, data: PhoneInput): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, error: "Unauthorized" }

  const parsed = phoneSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" }

  const d = parsed.data
  await db.phone.update({
    where: { id: phoneId },
    data: {
      name: d.name,
      slug: d.slug,
      launchYear: d.launchYear ?? null,
      description: d.description ?? null,
      isActive: d.isActive,
    },
  })

  revalidatePath(`/admin/catalog/phones/${phoneId}`)
  revalidatePath("/admin/catalog/phones")
  return { success: true, message: "Phone updated" }
}

export async function upsertPhoneSpecAction(phoneId: string, data: PhoneSpecInput): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, error: "Unauthorized" }

  const parsed = phoneSpecSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" }

  const d = parsed.data
  await db.phoneSpecification.upsert({
    where: { phoneId },
    create: { phoneId, ...d },
    update: { ...d },
  })

  revalidatePath(`/admin/catalog/phones/${phoneId}`)
  return { success: true, message: "Specifications saved" }
}

// ── GSM Arena enrichment for Phone catalog ────────────────────────────────

export async function enrichPhoneFromWebAction(phoneId: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, error: "Unauthorized" }

  const phone = await db.phone.findUnique({
    where: { id: phoneId },
    select: { name: true, brand: { select: { name: true } } },
  })
  if (!phone) return { success: false, error: "Phone not found" }

  const gsmUrl = await findGSMArenaUrl(phone.brand.name, phone.name)
  if (!gsmUrl) return { success: false, error: `Could not find "${phone.brand.name} ${phone.name}" on GSM Arena` }

  const allSpecs = await scrapeGSMArena(gsmUrl)
  if (!allSpecs) return { success: false, error: "Failed to scrape GSM Arena" }

  function val(...keys: string[]) {
    for (const k of keys) {
      for (const [specKey, v] of Object.entries(allSpecs!)) {
        if (specKey.toLowerCase().includes(k.toLowerCase())) return v
      }
    }
    return undefined
  }

  function num(v?: string) {
    if (!v) return undefined
    const n = parseInt(v.replace(/[^0-9]/g, ""))
    return isNaN(n) ? undefined : n
  }

  function flt(v?: string) {
    if (!v) return undefined
    const n = parseFloat(v.replace(/[^0-9.]/g, ""))
    return isNaN(n) ? undefined : n
  }

  const specs: PhoneSpecInput = {
    displaySize:       flt(val("Size")),
    displayType:       val("Type"),
    displayResolution: val("Resolution"),
    displayHz:         num(val("Refresh rate")),
    chipset:           val("Chipset"),
    cpu:               val("CPU"),
    gpu:               val("GPU"),
    rearCamera:        val("Main Camera / Type", "Dual", "Triple", "Quad"),
    frontCamera:       val("Selfie camera"),
    batteryMah:        num(val("Capacity")),
    charging:          val("Charging"),
    os:                val("OS"),
    bluetooth:         val("Bluetooth"),
    wifi:              val("WLAN"),
    usb:               val("USB"),
    nfc:               val("NFC") ? true : undefined,
    weightGrams:       num(val("Weight")),
    dimensions:        val("Dimensions"),
    build:             val("Build"),
    ip:                val("Protection"),
    sim:               val("SIM"),
  }

  await db.phoneSpecification.upsert({
    where: { phoneId },
    create: { phoneId, ...specs },
    update: { ...specs },
  })

  revalidatePath(`/admin/catalog/phones/${phoneId}`)
  return { success: true, message: `Enriched from GSM Arena` }
}

// ── Admin variant management ──────────────────────────────────────────────

export async function addPhoneVariantAction(
  phoneId: string,
  ram: number,
  storage: number,
  color: string,
  colorHex?: string,
): Promise<ActionResult<{ id: string }>> {
  if (!(await requireAdmin())) return { success: false, error: "Unauthorized" }

  const normalColor = normalizeColor(color)
  const existing = await db.phoneVariant.findUnique({
    where: { phoneId_ram_storage_color: { phoneId, ram, storage, color: normalColor } },
  })
  if (existing) return { success: false, error: "This variant already exists" }

  const variant = await db.phoneVariant.create({
    data: { phoneId, ram, storage, color: normalColor, colorHex: colorHex ?? null },
  })

  revalidatePath(`/admin/catalog/phones/${phoneId}`)
  return { success: true, data: { id: variant.id }, message: "Variant added" }
}

export async function deletePhoneVariantAction(variantId: string, phoneId: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, error: "Unauthorized" }

  const hasListings = await db.sellerPhoneListing.count({ where: { variantId } })
  if (hasListings > 0) return { success: false, error: "Cannot delete — sellers have active listings for this variant" }

  await db.phoneVariant.delete({ where: { id: variantId } })
  revalidatePath(`/admin/catalog/phones/${phoneId}`)
  return { success: true, message: "Variant removed" }
}

// ── Admin: seller listing management ─────────────────────────────────────

export async function adminUpdateListingAction(
  listingId: string,
  sellerId: string,
  data: AdminUpdateListingInput,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, error: "Unauthorized" }

  const parsed = adminUpdateListingSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" }

  const d = parsed.data
  await db.sellerPhoneListing.update({
    where: { id: listingId },
    data: {
      price: d.price,
      stock: d.stock,
      condition: d.condition,
      warrantyMonths: d.warrantyMonths ?? null,
      warrantyType: d.warrantyType || null,
      adminNotes: d.adminNotes || null,
      status: d.status,
    },
  })

  revalidatePath(`/admin/marketplace/sellers/new-phones/${sellerId}`)
  return { success: true, message: "Listing updated" }
}

export async function updateListingStatusAction(
  id: string,
  status: "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "REJECTED",
  sellerId: string,
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, error: "Unauthorized" }
  await db.sellerPhoneListing.update({ where: { id }, data: { status } })
  revalidatePath(`/admin/marketplace/sellers/new-phones/${sellerId}`)
  return { success: true, message: "Status updated" }
}

export async function deployListingAction(id: string, sellerId: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, error: "Unauthorized" }
  const listing = await db.sellerPhoneListing.findUnique({
    where: { id },
    select: { variant: { select: { phone: { select: { name: true, brand: { select: { name: true } } } }, ram: true, storage: true } } },
  })
  if (!listing) return { success: false, error: "Not found" }
  await db.sellerPhoneListing.update({ where: { id }, data: { status: "ACTIVE", deployedAt: new Date() } })
  revalidatePath(`/admin/marketplace/sellers/new-phones/${sellerId}`)
  const v = listing.variant
  return { success: true, message: `${v.phone.brand.name} ${v.phone.name} ${v.storage}GB deployed` }
}
