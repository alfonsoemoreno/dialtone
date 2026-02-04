import { NextResponse } from "next/server";
import { spotifyFetch } from "@/lib/spotify/api";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    uri?: string;
    deviceId?: string;
    type?: "track" | "playlist";
  };

  if (!body.uri) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const params = new URLSearchParams();
  if (body.deviceId) params.set("device_id", body.deviceId);

  const payload =
    body.type === "playlist"
      ? { context_uri: body.uri }
      : { uris: [body.uri] };

  try {
    await spotifyFetch<void>(`/me/player/play?${params.toString()}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
