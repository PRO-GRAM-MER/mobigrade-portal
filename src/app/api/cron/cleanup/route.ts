import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/cron/cleanup
// Scheduled daily at 03:00 UTC via vercel.json.
// Vercel injects Authorization: Bearer <CRON_SECRET> automatically.
// Manually trigger: curl -H "Authorization: Bearer $CRON_SECRET" /api/cron/cleanup
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const THIRTY_DAYS = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const ONE_YEAR    = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  const [notifications, orderHistory, returnHistory] = await Promise.all([
    // Delete read notifications older than 30 days
    prisma.notification.deleteMany({
      where: { read: true, createdAt: { lt: THIRTY_DAYS } },
    }),
    // Prune order status history older than 12 months
    prisma.orderStatusHistory.deleteMany({
      where: { createdAt: { lt: ONE_YEAR } },
    }),
    // Prune return status history older than 12 months
    prisma.returnStatusHistory.deleteMany({
      where: { createdAt: { lt: ONE_YEAR } },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    deleted: {
      notifications:   notifications.count,
      orderHistory:    orderHistory.count,
      returnHistory:   returnHistory.count,
    },
    ts: new Date().toISOString(),
  });
}
