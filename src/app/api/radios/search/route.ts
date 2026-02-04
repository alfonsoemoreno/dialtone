import { NextResponse } from "next/server";
import { getRadioBrowserBase } from "@/lib/radioBrowser";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const country = searchParams.get("country")?.trim();
  const limit = Number(searchParams.get("limit") ?? "20");

  const params = new URLSearchParams({
    hidebroken: "true",
    order: "clickcount",
    reverse: "true",
    limit: String(Math.min(Math.max(limit, 5), 50)),
  });

  if (query) params.set("name", query);
  if (country) params.set("country", country);

  const base = getRadioBrowserBase();
  const url = `${base}/json/stations/search?${params.toString()}`;

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) {
      return NextResponse.json({ stations: [] }, { status: 200 });
    }
    const data = (await res.json()) as unknown[];
    return NextResponse.json({ stations: data });
  } catch {
    return NextResponse.json({ stations: [] }, { status: 200 });
  }
}
