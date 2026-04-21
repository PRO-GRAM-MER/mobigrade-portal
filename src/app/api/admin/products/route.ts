import { auth } from "@/auth";
import { querySellerProducts } from "@/lib/queries/admin";
import { NextResponse } from "next/server";
import { apiOk, apiErr } from "@/lib/api";
import type { SellerProductStatus } from "@prisma/client";

// GET /api/admin/products?status=ACTIVE&page=1
export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json(apiErr("Unauthorized"), { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as SellerProductStatus | null;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  const data = await querySellerProducts(status ?? undefined, page);
  return NextResponse.json(apiOk(data));
}
