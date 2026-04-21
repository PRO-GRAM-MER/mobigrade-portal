import { auth } from "@/auth";
import { requestReturnAction } from "@/actions/return-actions";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/orders/[id]/returns — buyer requests return
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "RETAILER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: orderId } = await params;
  const body = await req.json().catch(() => ({}));

  const result = await requestReturnAction({ ...body, orderId });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json(result.data, { status: 201 });
}

// GET /api/orders/[id]/returns — list return requests for an order
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: orderId } = await params;

  const returns = await prisma.returnRequest.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    include: {
      items: { include: { orderItem: { select: { productTitle: true, quantity: true } } } },
      refund: { select: { amount: true, status: true } },
    },
  });

  return NextResponse.json(returns);
}
