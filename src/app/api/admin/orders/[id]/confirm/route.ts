import { auth } from "@/auth";
import { adminConfirmOrderAction } from "@/actions/order-actions";
import { NextResponse } from "next/server";

// POST /api/admin/orders/[id]/confirm
// PAYMENT_CAPTURED → CONFIRMED → PROCESSING (combined step)
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await adminConfirmOrderAction(id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
