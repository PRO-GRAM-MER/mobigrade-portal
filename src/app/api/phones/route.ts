import { NextRequest, NextResponse } from "next/server"
import { getPhonesByBrand } from "@/features/phones/catalog-queries"

export async function GET(req: NextRequest) {
  const brandId = req.nextUrl.searchParams.get("brandId")
  if (!brandId) return NextResponse.json([])
  const phones = await getPhonesByBrand(brandId)
  return NextResponse.json(phones)
}
