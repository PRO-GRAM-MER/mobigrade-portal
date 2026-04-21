import { auth } from "@/auth";
import { markDeliveredAction } from "@/actions/order-actions";
import { NextResponse } from "next/server";

// POST /api/admin/orders/[id]/deliver
// SHIPPED | OUT_FOR_DELIVERY → DELIVERED
// Creates SellerEarning rows with T+7 hold
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await markDeliveredAction(id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
