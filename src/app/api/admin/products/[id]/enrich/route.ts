import { auth } from "@/auth";
import { enrichProductAction } from "@/actions/admin-actions";
import { NextResponse } from "next/server";
import type { EnrichProductInput } from "@/lib/validations/admin";

// PUT /api/admin/products/[id]/enrich
// Body: EnrichProductInput
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body: EnrichProductInput = await req.json().catch(() => ({}));

  const result = await enrichProductAction(id, body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error, fieldErrors: result.fieldErrors },
      { status: 422 }
    );
  }

  return NextResponse.json({ ok: true, data: result.data });
}
