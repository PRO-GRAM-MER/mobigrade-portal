import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { parsePage } from "@/lib/scrape/parsers";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
  "Cache-Control":   "no-cache",
};

export async function POST(req: NextRequest) {
  // Admin-only
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const url  = typeof body.url === "string" ? body.url.trim() : "";

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // Validate URL
  let parsed: URL;
  try {
    parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("bad protocol");
  } catch {
    return NextResponse.json({ error: "Invalid URL — must start with http/https" }, { status: 400 });
  }

  try {
    const res = await fetch(parsed.toString(), {
      headers: HEADERS,
      signal:  AbortSignal.timeout(12000),
      // Follow redirects (default in fetch)
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Site returned HTTP ${res.status}. Try a different URL.` },
        { status: 400 }
      );
    }

    const html    = await res.text();
    const scraped = parsePage(html, url);

    return NextResponse.json({ success: true, data: scraped });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Scrape failed";
    // Timeout
    if (msg.includes("signal") || msg.includes("abort") || msg.includes("timeout")) {
      return NextResponse.json({ error: "Request timed out — site took too long to respond." }, { status: 408 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
