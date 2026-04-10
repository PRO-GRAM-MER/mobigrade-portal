import { auth } from "@/auth";
import { placeOrderAction } from "@/actions/order-actions";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

const log = logger("api/orders");

// POST /api/orders — place a new order (RETAILER only)
export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "RETAILER") {
    log.warn("POST /api/orders: unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  log.info("POST /api/orders", { userId: session.user.id });
  const result = await placeOrderAction(body);

  if (!result.success) {
    log.warn("POST /api/orders: failed", { userId: session.user.id, error: result.error });
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  log.info("POST /api/orders: created", { userId: session.user.id, orderId: result.data?.orderId });
  return NextResponse.json(result.data, { status: 201 });
}

// GET /api/orders — buyer's order history
export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "RETAILER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const retailer = await prisma.retailerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!retailer) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const PAGE_SIZE = 20;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { retailerProfileId: retailer.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, orderNumber: true, status: true, total: true,
        createdAt: true, shippedAt: true, deliveredAt: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where: { retailerProfileId: retailer.id } }),
  ]);

  return NextResponse.json({ orders, total, page });
}
