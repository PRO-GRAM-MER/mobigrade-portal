import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/health — liveness + DB connectivity check
// Used by uptime monitors (UptimeRobot, Vercel, etc.)
export async function GET() {
  try {
    // Lightweight ping — no table scan
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", db: "connected", ts: new Date().toISOString() },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { status: "error", db: "unreachable", message: String(err) },
      { status: 503 }
    );
  }
}
