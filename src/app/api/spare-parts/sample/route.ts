import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

// Mandatory: category, qualityGrade, brandName, modelName, price, discountedPrice, quantity
// Optional:  name (auto-generated if blank), color (single color per row), highlights (semicolon-separated)
// category values:    DISPLAY | BATTERY | CAMERA_REAR | CAMERA_FRONT | AUDIO | CHARGING | BODY | SENSOR | INTERNAL | THERMAL | OTHER
// qualityGrade values: OEM | AFTERMARKET_HIGH | AFTERMARKET_LOW
// Multi-model: add one row per model — rows with same category+qualityGrade+price+discountedPrice+name are merged into one part
const HEADERS = ["name", "category", "qualityGrade", "brandName", "modelName", "price", "discountedPrice", "quantity", "color", "highlights"]

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }
  if (session.user.role !== "SELLER") {
    return new NextResponse("Forbidden", { status: 403 })
  }

  return new NextResponse(HEADERS.join(","), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="spare-parts-sample.csv"',
    },
  })
}
