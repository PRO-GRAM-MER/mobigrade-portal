import { auth } from "@/auth";
import { queryPendingDrafts, queryPendingBatches } from "@/lib/queries/admin";
import { NextResponse } from "next/server";
import { apiOk, apiErr } from "@/lib/api";

// GET /api/admin/review?page=1&view=batches|drafts&batchId=xxx
export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json(apiErr("Unauthorized"), { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") ?? "drafts";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const batchId = searchParams.get("batchId") ?? undefined;

  if (view === "batches") {
    const data = await queryPendingBatches();
    return NextResponse.json(apiOk(data));
  }

  const data = await queryPendingDrafts(page, batchId);
  return NextResponse.json(apiOk(data));
}
