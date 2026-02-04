import { NextResponse } from "next/server";
import { spotifyFetch } from "@/lib/spotify/api";

export async function POST(request: Request) {
  const body = (await request.json()) as { deviceId?: string; play?: boolean };
  if (!body.deviceId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await spotifyFetch<void>("/me/player", {
      method: "PUT",
      body: JSON.stringify({
        device_ids: [body.deviceId],
        play: body.play ?? true,
      }),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
