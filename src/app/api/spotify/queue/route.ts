import { NextResponse } from "next/server";
import { spotifyFetch } from "@/lib/spotify/api";

export async function POST(request: Request) {
  const body = (await request.json()) as { uri?: string; deviceId?: string };
  if (!body.uri) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const params = new URLSearchParams({ uri: body.uri });
  if (body.deviceId) params.set("device_id", body.deviceId);

  try {
    await spotifyFetch<void>(`/me/player/queue?${params.toString()}`, {
      method: "POST",
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
