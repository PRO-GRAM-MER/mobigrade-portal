import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiOk, apiErr } from "@/lib/api";

// Colours assigned to categories in order they appear — consistent across calls
const PALETTE = ["#2F3567", "#FF6F3F", "#00A267", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4"];

function getStartDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case "weekly":  return new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
    case "yearly":  return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case "monthly":
    default:        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json(apiErr("Unauthorized"), { status: 401 });
  }

  const period = new URL(req.url).searchParams.get("period") ?? "monthly";
  const startDate = getStartDate(period);

  const [totalTransactions, salesAgg, orderItems] = await Promise.all([
    // Total captured payments in period
    prisma.payment.count({
      where: { status: "CAPTURED", createdAt: { gte: startDate } },
    }),

    // Total sales value from non-cancelled/failed orders in period
    prisma.order.aggregate({
      _sum: { total: true },
      where: {
        createdAt: { gte: startDate },
        status: { notIn: ["PAYMENT_PENDING", "PAYMENT_FAILED", "CANCELLED"] },
      },
    }),

    // Order items for category breakdown — from LiveProduct → SellerProduct → SparePartCategory
    prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: startDate },
          status: { notIn: ["PAYMENT_PENDING", "PAYMENT_FAILED", "CANCELLED"] },
        },
      },
      select: {
        totalPrice: true,
        sellerProduct: {
          select: {
            category: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ]);

  // Aggregate order items by category
  const categoryMap = new Map<string, { name: string; total: number }>();
  for (const item of orderItems) {
    const cat = item.sellerProduct?.category;
    if (!cat) continue;
    const prev = categoryMap.get(cat.id);
    if (prev) {
      prev.total += Number(item.totalPrice);
    } else {
      categoryMap.set(cat.id, { name: cat.name, total: Number(item.totalPrice) });
    }
  }

  // Sort by total descending and assign colours
  const categoryBreakdown = [...categoryMap.values()]
    .sort((a, b) => b.total - a.total)
    .map((c, i) => ({ ...c, color: PALETTE[i % PALETTE.length] }));

  return NextResponse.json(apiOk({
    totalTransactions,
    totalSales: Number(salesAgg._sum.total ?? 0),
    categoryBreakdown,
  }));
}
