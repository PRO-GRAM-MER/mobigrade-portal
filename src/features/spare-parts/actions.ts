"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { sparePartSchema, type SparePartInput } from "./schemas"
import type { ActionResult } from "@/types"
import { createAdminNotifications } from "@/features/notifications/actions"

export type CSVUploadResult = {
  created: number
  errors: { row: number; error: string }[]
}

type ParsedCSVRow = {
  name: string
  category: string
  qualityGrade: string
  brandName: string
  modelName: string
  price: string
  discountedPrice: string
  quantity: string
  color: string
  highlights: string
}

function parseCSV(text: string): ParsedCSVRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""))
  const required = ["category", "qualityGrade", "brandName", "modelName", "price", "discountedPrice", "quantity"]
  for (const h of required) {
    if (!headers.includes(h)) throw new Error(`Missing column: ${h}`)
  }

  return lines.slice(1).map((line) => {
    const values: string[] = []
    let cur = ""
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === "," && !inQuote) {
        values.push(cur.trim()); cur = ""
      } else {
        cur += ch
      }
    }
    values.push(cur.trim())

    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] ?? "" })
    return row as unknown as ParsedCSVRow
  })
}

type ValidatedRow = {
  rowNum: number
  name: string
  category: string
  qualityGrade: string
  price: number
  discountedPrice: number
  quantity: number
  color: string | null
  highlights: string[]
  modelIds: string[]
}

// Rows with same name+category+qualityGrade+price+discountedPrice = one part; models and colors are unioned
function partGroupKey(name: string, category: string, qualityGrade: string, price: number, discountedPrice: number) {
  return `${name.trim().toLowerCase()}||${category}||${qualityGrade}||${price}||${discountedPrice}`
}

export async function uploadSparePartsCSVAction(
  csvText: string
): Promise<ActionResult<CSVUploadResult>> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }
    if (session.user.role !== "SELLER") return { success: false, error: "Unauthorized" }

    let rows: ParsedCSVRow[]
    try {
      rows = parseCSV(csvText)
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }

    if (rows.length === 0) return { success: false, error: "CSV has no data rows" }
    if (rows.length > 5000) return { success: false, error: "Max 5000 rows per upload" }

    const brands = await db.brand.findMany({
      select: { id: true, name: true, models: { select: { id: true, name: true } } },
    })
    const brandMap = new Map(brands.map((b) => [b.name.toLowerCase(), b]))

    const errors: { row: number; error: string }[] = []

    // Phase 1: validate each row, collect model IDs
    const validRows: ValidatedRow[] = []

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2
      const r = rows[i]

      const validCategories = ["DISPLAY","BATTERY","CAMERA_REAR","CAMERA_FRONT","AUDIO","CHARGING","BODY","SENSOR","INTERNAL","THERMAL","OTHER"]
      const category = r.category?.trim().toUpperCase()
      if (!validCategories.includes(category)) { errors.push({ row: rowNum, error: `Invalid category "${r.category}". Valid: ${validCategories.join(", ")}` }); continue }

      const validGrades = ["OEM","AFTERMARKET_HIGH","AFTERMARKET_LOW"]
      const qualityGrade = r.qualityGrade?.trim().toUpperCase()
      if (!validGrades.includes(qualityGrade)) { errors.push({ row: rowNum, error: `Invalid qualityGrade "${r.qualityGrade}". Valid: ${validGrades.join(", ")}` }); continue }

      const brand = brandMap.get(r.brandName?.trim().toLowerCase() ?? "")
      if (!brand) { errors.push({ row: rowNum, error: `Brand "${r.brandName}" not found` }); continue }

      const modelName = r.modelName?.trim()
      if (!modelName) { errors.push({ row: rowNum, error: "modelName is required" }); continue }
      const model = brand.models.find((bm) => bm.name.toLowerCase() === modelName.toLowerCase())
      if (!model) { errors.push({ row: rowNum, error: `Model "${modelName}" not found under ${brand.name}` }); continue }

      const price = parseFloat(r.price)
      const discountedPrice = parseFloat(r.discountedPrice)
      const quantity = parseInt(r.quantity, 10)

      if (isNaN(price) || price <= 0) { errors.push({ row: rowNum, error: "Invalid price" }); continue }
      if (isNaN(discountedPrice) || discountedPrice <= 0) { errors.push({ row: rowNum, error: "Invalid discountedPrice" }); continue }
      if (discountedPrice > price) { errors.push({ row: rowNum, error: "discountedPrice must be ≤ price" }); continue }
      if (isNaN(quantity) || quantity < 1) { errors.push({ row: rowNum, error: "Invalid quantity" }); continue }

      // name is optional — auto-generate from category + brand + model if blank
      const name = r.name?.trim() || `${brand.name} ${modelName} ${category.charAt(0) + category.slice(1).toLowerCase()}`

      const color = r.color?.trim() || null
      const highlights = r.highlights?.split(";").map((h) => h.trim()).filter(Boolean) ?? []

      validRows.push({ rowNum, name, category, qualityGrade, price, discountedPrice, quantity, color, highlights, modelIds: [model.id] })
    }

    // Fail entire upload if any row has errors
    if (errors.length > 0) {
      return { success: true, data: { created: 0, errors }, message: "Fix errors and re-upload" }
    }

    // Phase 2: group by part identity → one SparePart per group
    const groups = new Map<string, ValidatedRow[]>()
    for (const row of validRows) {
      const key = partGroupKey(row.name, row.category, row.qualityGrade, row.price, row.discountedPrice)
      const existing = groups.get(key)
      if (existing) {
        existing.push(row)
      } else {
        groups.set(key, [row])
      }
    }

    // Phase 2b: check for duplicates against existing DB records
    const groupList = [...groups.values()]
    const existingParts = await db.sparePart.findMany({
      where: { sellerId: session.user.id },
      select: { name: true, category: true, qualityGrade: true },
    })
    const existingSet = new Set(
      existingParts.map((p) => `${p.name.trim().toLowerCase()}||${p.category}||${p.qualityGrade}`)
    )
    const duplicateErrors: { row: number; error: string }[] = []
    for (const groupRows of groupList) {
      const first = groupRows[0]
      const dupKey = `${first.name.trim().toLowerCase()}||${first.category}||${first.qualityGrade}`
      if (existingSet.has(dupKey)) {
        duplicateErrors.push({
          row: first.rowNum,
          error: `Duplicate: "${first.name}" (${first.category} / ${first.qualityGrade}) already exists in your inventory`,
        })
      }
    }
    if (duplicateErrors.length > 0) {
      return { success: true, data: { created: 0, errors: duplicateErrors }, message: "Duplicate entries found" }
    }

    // Phase 3: create one SparePart per group
    let created = 0
    for (const groupRows of groups.values()) {
      const first = groupRows[0]
      const allModelIds = [...new Set(groupRows.flatMap((r) => r.modelIds))]
      const allColors = [...new Set(groupRows.map((r) => r.color).filter((c): c is string => c !== null))]

      try {
        await db.sparePart.create({
          data: {
            sellerId: session.user.id,
            name: first.name,
            category: first.category as Parameters<typeof db.sparePart.create>[0]["data"]["category"],
            qualityGrade: first.qualityGrade as Parameters<typeof db.sparePart.create>[0]["data"]["qualityGrade"],
            price: first.price,
            discountedPrice: first.discountedPrice,
            quantity: first.quantity,
            isGenericColor: allColors.length === 0,
            colors: allColors,
            highlights: first.highlights,
            uploadType: "CSV",
            status: "PENDING_REVIEW",
            models: { connect: allModelIds.map((id) => ({ id })) },
          },
        })
        created++
      } catch {
        errors.push({ row: first.rowNum, error: "Database error creating part — check data and retry" })
      }
    }

    revalidatePath("/marketplace/spare-parts")

    if (created > 0) {
      try {
        const seller = await db.user.findUnique({
          where: { id: session.user.id },
          select: { firstName: true, lastName: true, sellerProfile: { select: { businessName: true } } },
        })
        const name = seller?.sellerProfile?.businessName ?? `${seller?.firstName} ${seller?.lastName}`
        await createAdminNotifications(
          "SPARE_PARTS_UPLOADED",
          "New spare parts uploaded",
          `${name} uploaded ${created} spare part${created !== 1 ? "s" : ""} via CSV`,
          `/admin/marketplace/sellers/spare-parts/${session.user.id}`
        )
        revalidatePath("/admin/marketplace/sellers/spare-parts")
        revalidatePath("/admin/dashboard")
      } catch (notifErr) {
        console.error("CSV upload notification failed:", notifErr)
      }
    }

    return { success: true, data: { created, errors }, message: `${created} part(s) created` }
  } catch (err) {
    console.error("uploadSparePartsCSVAction error:", err)
    return { success: false, error: "Upload failed. Try again." }
  }
}

export async function createSparePartAction(
  data: SparePartInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }
    if (session.user.role !== "SELLER") return { success: false, error: "Unauthorized" }

    const parsed = sparePartSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" }
    }

    const { name, category, qualityGrade, modelIds, price, discountedPrice, quantity, isGenericColor, colors, warrantyDays, specs, productDetails, highlights } = parsed.data

    const sparePart = await db.sparePart.create({
      data: {
        sellerId: session.user.id,
        name,
        category,
        qualityGrade,
        price,
        discountedPrice,
        quantity,
        isGenericColor,
        colors: isGenericColor ? [] : colors,
        warrantyDays: warrantyDays ?? null,
        specs: specs && specs.length > 0 ? specs : undefined,
        productDetails: productDetails || undefined,
        highlights: highlights ?? [],
        uploadType: "MANUAL",
        status: "PENDING_REVIEW",
        models: {
          connect: modelIds.map((id) => ({ id })),
        },
      },
    })

    revalidatePath("/marketplace/spare-parts")

    try {
      const seller = await db.user.findUnique({
        where: { id: session.user.id },
        select: { firstName: true, lastName: true, sellerProfile: { select: { businessName: true } } },
      })
      const sellerName = seller?.sellerProfile?.businessName ?? `${seller?.firstName} ${seller?.lastName}`
      await createAdminNotifications(
        "SPARE_PART_CREATED",
        "New spare part listed",
        `${sellerName} manually added "${name}"`,
        `/admin/marketplace/sellers/spare-parts/${session.user.id}`
      )
      revalidatePath("/admin/marketplace/sellers/spare-parts")
      revalidatePath("/admin/dashboard")
    } catch (notifErr) {
      console.error("Create part notification failed:", notifErr)
    }

    return { success: true, data: { id: sparePart.id }, message: "Spare part submitted for review" }
  } catch (err) {
    console.error("createSparePartAction error:", err)
    return { success: false, error: "Failed to create spare part. Try again." }
  }
}

export async function deletePendingCSVUploadsAction(): Promise<ActionResult<{ deleted: number }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }
    if (session.user.role !== "SELLER") return { success: false, error: "Unauthorized" }

    const { count } = await db.sparePart.deleteMany({
      where: {
        sellerId: session.user.id,
        uploadType: "CSV",
        status: "PENDING_REVIEW",
      },
    })

    revalidatePath("/marketplace/spare-parts")
    return { success: true, data: { deleted: count }, message: `${count} pending CSV upload(s) removed` }
  } catch (err) {
    console.error("deletePendingCSVUploadsAction error:", err)
    return { success: false, error: "Failed to delete uploads. Try again." }
  }
}
