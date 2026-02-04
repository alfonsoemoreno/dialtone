import { NextResponse } from "next/server";
import { spotifyFetch } from "@/lib/spotify/api";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ tracks: [] }, { status: 400 });
  }

  try {
    const data = await spotifyFetch<any>(`/albums/${id}/tracks?limit=50`);
    const tracks = (data.items ?? []).map((track: any) => ({
      id: track.id,
      name: track.name,
      uri: track.uri,
      artists: track.artists?.map((a: any) => a.name).join(", ") ?? "",
    }));
    return NextResponse.json({ tracks });
  } catch {
    return NextResponse.json({ tracks: [] }, { status: 500 });
  }
}
