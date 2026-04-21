import { auth } from "@/auth";
import { cancelOrderAction } from "@/actions/order-actions";
import { NextResponse } from "next/server";

// POST /api/orders/[id]/cancel
// Body: { note: string }
// Actors: BUYER (before CONFIRMED), SELLER (at PROCESSING), ADMIN (pre-SHIPPED)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { note } = await req.json().catch(() => ({ note: "" }));

  const result = await cancelOrderAction(id, note ?? "");

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
