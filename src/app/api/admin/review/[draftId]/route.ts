import { auth } from "@/auth";
import {
  approveDraftAction,
  rejectDraftAction,
  requestChangesAction,
} from "@/actions/admin-actions";
import { NextResponse } from "next/server";

// POST /api/admin/review/[draftId]
// Body: { action: "approve" | "reject" | "request_changes", reason?: string }

export async function POST(
  req: Request,
  { params }: { params: Promise<{ draftId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { draftId } = await params;
  const body = await req.json().catch(() => ({}));
  const { action, reason } = body as { action?: string; reason?: string };

  if (!action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  let result;

  switch (action) {
    case "approve":
      result = await approveDraftAction(draftId);
      break;
    case "reject":
      result = await rejectDraftAction(draftId, reason ?? "");
      break;
    case "request_changes":
      result = await requestChangesAction(draftId, reason ?? "");
      break;
    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
  }

  if (!result.success) {
    return NextResponse.json(
      { error: result.error, fieldErrors: result.fieldErrors },
      { status: 422 }
    );
  }

  return NextResponse.json({ ok: true, data: result.data });
}
