import { auth } from "@/auth";
import { shipOrderAction } from "@/actions/order-actions";
import { NextResponse } from "next/server";

// POST /api/seller/orders/[id]/ship
// Body: { trackingNumber: string, courierName: string }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "SELLER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { trackingNumber, courierName } = await req.json().catch(() => ({}));

  const result = await shipOrderAction(id, trackingNumber, courierName);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
