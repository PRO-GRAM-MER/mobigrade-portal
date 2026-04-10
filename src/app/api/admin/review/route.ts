import { auth } from "@/auth";
import { listPendingDraftsAction, listPendingBatchesAction } from "@/actions/admin-actions";
import { NextResponse } from "next/server";

// GET /api/admin/review?page=1&view=batches|drafts&batchId=xxx
export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") ?? "drafts";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const batchId = searchParams.get("batchId") ?? undefined;

  if (view === "batches") {
    const data = await listPendingBatchesAction();
    return NextResponse.json(data);
  }

  const data = await listPendingDraftsAction(page, batchId);
  return NextResponse.json(data);
}
