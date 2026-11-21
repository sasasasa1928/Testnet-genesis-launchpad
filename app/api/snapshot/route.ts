import { NextResponse } from "next/server";
import { DEMO } from "@/lib/config";
import { getSnapshot } from "@/lib/indexer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Indexed Genesis data (coins + trades). Cached briefly at the CDN so traffic spikes stay cheap. */
export async function GET() {
  if (DEMO) return NextResponse.json({ error: "demo mode" }, { status: 404 });
  try {
    const snap = await getSnapshot();
    return NextResponse.json(snap, {
      headers: { "Cache-Control": "public, s-maxage=4, stale-while-revalidate=30" },
    });
  } catch (e) {
    console.error("snapshot failed", e);
    return NextResponse.json({ error: "indexer unavailable" }, { status: 503 });
  }
}
