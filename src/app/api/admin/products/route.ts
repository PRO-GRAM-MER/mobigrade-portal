import { auth } from "@/auth";
import { listSellerProductsAction } from "@/actions/admin-actions";
import { NextResponse } from "next/server";
import type { SellerProductStatus } from "@prisma/client";

// GET /api/admin/products?status=ACTIVE&page=1
export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as SellerProductStatus | null;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  const data = await listSellerProductsAction(status ?? undefined, page);
  return NextResponse.json(data);
}
