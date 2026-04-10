import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const PALETTE = ["#2F3567", "#FF6F3F", "#00A267", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4"];

function getStartDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case "weekly":  return new Date(now.getTime() - 7   * 24 * 60 * 60 * 1000);
    case "yearly":  return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case "monthly":
    default:        return new Date(now.getTime() - 30  * 24 * 60 * 60 * 1000);
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "SELLER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const period    = new URL(req.url).searchParams.get("period") ?? "monthly";
  const startDate = getStartDate(period);

  const [orderItemCount, earningRows] = await Promise.all([
    // Total order items (transactions) in period
    prisma.orderItem.count({
      where: { sellerProfileId: profile.id, createdAt: { gte: startDate } },
    }),

    // All earnings in period with category info
    prisma.sellerEarning.findMany({
      where: {
        sellerProfileId: profile.id,
        createdAt: { gte: startDate },
      },
      select: {
        netAmount: true,
        grossAmount: true,
        status: true,
        orderItem: {
          select: {
            sellerProduct: {
              select: {
                category: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  // Aggregate totals
  let grossSales  = 0;
  let netEarnings = 0;
  let onHold      = 0;
  let cleared     = 0;

  const categoryMap = new Map<string, { name: string; total: number }>();

  for (const row of earningRows) {
    const net   = Number(row.netAmount);
    const gross = Number(row.grossAmount);
    grossSales  += gross;
    netEarnings += net;
    if (row.status === "ON_HOLD") onHold  += net;
    if (row.status === "CLEARED") cleared += net;

    const cat = row.orderItem?.sellerProduct?.category;
    if (cat) {
      const prev = categoryMap.get(cat.id);
      if (prev) prev.total += net;
      else categoryMap.set(cat.id, { name: cat.name, total: net });
    }
  }

  const categoryBreakdown = [...categoryMap.values()]
    .sort((a, b) => b.total - a.total)
    .map((c, i) => ({ ...c, color: PALETTE[i % PALETTE.length] }));

  return NextResponse.json({
    totalOrderItems: orderItemCount,
    grossSales,
    netEarnings,
    onHold,
    cleared,
    categoryBreakdown,
  });
}
