import { auth } from "@/auth";
import { reviewReturnAction, closeReturnWithRefundAction } from "@/actions/return-actions";
import { NextResponse } from "next/server";

// POST /api/admin/returns/[id]/review
// Body: { action: "approve" | "reject" | "close_with_refund", note?: string, refundAmount?: number }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { action, note, refundAmount } = await req.json().catch(() => ({}));

  let result;

  switch (action) {
    case "approve":
      result = await reviewReturnAction(id, "APPROVED", note);
      break;
    case "reject":
      result = await reviewReturnAction(id, "REJECTED", note);
      break;
    case "close_with_refund":
      result = await closeReturnWithRefundAction(id, refundAmount);
      break;
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
