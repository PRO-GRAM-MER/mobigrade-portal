"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  sellerListingSchema, listingCsvRowSchema,
  normalizeColor, type SellerListingInput,
} from "./schemas"
import { findOrCreateVariant } from "./catalog-queries"
import type { ActionResult } from "@/types"
import { createAdminNotifications } from "@/features/notifications/actions"

export type CSVUploadResult = { created: number; errors: { row: number; error: string }[] }

// ── CSV parsing ───────────────────────────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())
  return lines.slice(1).map((line) => {
    const values: string[] = []
    let cur = ""
    let inQuote = false
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === "," && !inQuote) { values.push(cur.trim()); cur = "" }
      else { cur += ch }
    }
    values.push(cur.trim())
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]))
  })
}

// ── Upload CSV ────────────────────────────────────────────────────────────

export async function uploadPhoneListingsCSVAction(
  csvText: string,
): Promise<ActionResult<CSVUploadResult>> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }
    if (session.user.role !== "SELLER") return { success: false, error: "Unauthorized" }

    const rows = parseCSV(csvText)
    if (rows.length === 0) return { success: false, error: "CSV empty or malformed" }
    if (rows.length > 2000) return { success: false, error: "Max 2000 rows per upload" }

    const errors: { row: number; error: string }[] = []
    let created = 0

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2
      const raw = rows[i]

      const parsed = listingCsvRowSchema.safeParse({
        ...raw,
        condition: raw.condition || "SEALED",
        warranty_months: raw.warranty_months || undefined,
      })

      if (!parsed.success) {
        errors.push({ row: rowNum, error: parsed.error.issues[0]?.message ?? "Invalid row" })
        continue
      }

      const d = parsed.data
      const color = normalizeColor(d.color)

      // Resolve phone
      const phone = await db.phone.findFirst({
        where: {
          name: { equals: d.phone_name, mode: "insensitive" },
          brand: { name: { equals: d.brand_name, mode: "insensitive" } },
          isActive: true,
        },
        select: { id: true, name: true, brand: { select: { name: true } } },
      })

      if (!phone) {
        errors.push({ row: rowNum, error: `Phone "${d.phone_name}" by "${d.brand_name}" not found in catalog. Admin must add it first.` })
        continue
      }

      try {
        const variant = await findOrCreateVariant(phone.id, d.ram, d.storage, color, d.color_hex ?? null)

        await db.sellerPhoneListing.create({
          data: {
            sellerId: session.user.id,
            variantId: variant.id,
            price: d.price,
            stock: d.stock,
            sku: d.sku || null,
            condition: d.condition,
            warrantyMonths: d.warranty_months ?? null,
            warrantyType: d.warranty_type || null,
            uploadType: "CSV",
            status: "PENDING_REVIEW",
          },
        })
        created++
      } catch {
        errors.push({ row: rowNum, error: "Database error — possible duplicate listing for this variant" })
      }
    }

    revalidatePath("/marketplace/new-phones")

    if (created > 0) {
      try {
        const seller = await db.user.findUnique({
          where: { id: session.user.id },
          select: { firstName: true, lastName: true, sellerProfile: { select: { businessName: true } } },
        })
        const name = seller?.sellerProfile?.businessName ?? `${seller?.firstName} ${seller?.lastName}`
        await createAdminNotifications(
          "NEW_PHONES_UPLOADED",
          "New phone listings uploaded",
          `${name} uploaded ${created} phone listing${created !== 1 ? "s" : ""} via CSV`,
          `/admin/marketplace/sellers/new-phones/${session.user.id}`
        )
        revalidatePath("/admin/marketplace/sellers/new-phones")
        revalidatePath("/admin/dashboard")
      } catch (e) {
        console.error("Phone CSV notification failed:", e)
      }
    }

    return { success: true, data: { created, errors }, message: `${created} listing(s) created` }
  } catch (err) {
    console.error("uploadPhoneListingsCSVAction error:", err)
    return { success: false, error: "Upload failed. Try again." }
  }
}

// ── Manual create listing ─────────────────────────────────────────────────

export async function createPhoneListingAction(
  data: SellerListingInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }
    if (session.user.role !== "SELLER") return { success: false, error: "Unauthorized" }

    const parsed = sellerListingSchema.safeParse(data)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" }

    const d = parsed.data
    const color = normalizeColor(d.color)

    const phone = await db.phone.findUnique({
      where: { id: d.phoneId, isActive: true },
      select: { name: true, brand: { select: { name: true } } },
    })
    if (!phone) return { success: false, error: "Phone not found in catalog" }

    const variant = await findOrCreateVariant(d.phoneId, d.ram, d.storage, color, d.colorHex ?? null)

    const listing = await db.sellerPhoneListing.create({
      data: {
        sellerId: session.user.id,
        variantId: variant.id,
        price: d.price,
        stock: d.stock,
        sku: d.sku || null,
        condition: d.condition,
        warrantyMonths: d.warrantyMonths ?? null,
        warrantyType: d.warrantyType || null,
        uploadType: "MANUAL",
        status: "PENDING_REVIEW",
      },
    })

    revalidatePath("/marketplace/new-phones")

    try {
      const seller = await db.user.findUnique({
        where: { id: session.user.id },
        select: { firstName: true, lastName: true, sellerProfile: { select: { businessName: true } } },
      })
      const sellerName = seller?.sellerProfile?.businessName ?? `${seller?.firstName} ${seller?.lastName}`
      await createAdminNotifications(
        "NEW_PHONE_CREATED",
        "New phone listed",
        `${sellerName} added ${phone.brand.name} ${phone.name} ${d.ram}GB/${d.storage}GB ${color}`,
        `/admin/marketplace/sellers/new-phones/${session.user.id}`
      )
      revalidatePath("/admin/marketplace/sellers/new-phones")
      revalidatePath("/admin/dashboard")
    } catch (e) {
      console.error("Phone listing notification failed:", e)
    }

    return { success: true, data: { id: listing.id }, message: "Listing submitted for review" }
  } catch (err) {
    console.error("createPhoneListingAction error:", err)
    return { success: false, error: "Failed to create listing. Try again." }
  }
}

// ── Delete pending CSV listings ───────────────────────────────────────────

export async function deletePendingPhoneCSVListingsAction(): Promise<ActionResult<{ deleted: number }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }
    const { count } = await db.sellerPhoneListing.deleteMany({
      where: { sellerId: session.user.id, status: "DRAFT", uploadType: "CSV" },
    })
    revalidatePath("/marketplace/new-phones")
    return { success: true, data: { deleted: count }, message: `${count} draft(s) cleared` }
  } catch {
    return { success: false, error: "Failed to clear drafts" }
  }
}
