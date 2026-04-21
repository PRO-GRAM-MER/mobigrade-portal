import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { generateSignedUploadParams } from "@/lib/cloudinary";

// GET /api/profile/upload-signature
// Signed upload params for avatar — any authenticated user (SELLER or ADMIN)
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const folder = `mobigrade/avatars/${session.user.id}`;
  const params = generateSignedUploadParams(session.user.id, folder);
  return NextResponse.json(params);
}
