import { NextRequest, NextResponse } from "next/server";
import { STATE_NAME_TO_ABBR } from "@/lib/timezone";

// Nominatim (OpenStreetMap) usage policy requires a descriptive User-Agent and caps at
// ~1 request/sec — fine for a lead-entry form a human is typing into, never batch-called.
const USER_AGENT = "builtbyjawad-portal/1.0 (jawad@builtbyjawad.com)";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ city: null, state: null });

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("q", q);

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return NextResponse.json({ city: null, state: null });

  const results = await res.json();
  const first = results?.[0];
  if (!first?.address) return NextResponse.json({ city: null, state: null });

  const addr = first.address;
  const city: string | null = addr.city || addr.town || addr.village || addr.hamlet || null;

  const isoState = addr["ISO3166-2-lvl4"]?.toString().split("-")[1];
  const state: string | null =
    (isoState && isoState.length === 2 ? isoState.toUpperCase() : null) ??
    (addr.state ? STATE_NAME_TO_ABBR[addr.state.toLowerCase()] ?? null : null);

  return NextResponse.json({ city, state });
}
