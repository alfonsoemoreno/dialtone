import { NextResponse } from "next/server";
import { spotifyFetch } from "@/lib/spotify/api";

export async function POST() {
  try {
    await spotifyFetch<void>("/me/player/next", { method: "POST" });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
