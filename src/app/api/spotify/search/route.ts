import { NextResponse } from "next/server";
import { spotifyFetch } from "@/lib/spotify/api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const limit = Number(searchParams.get("limit") ?? "10");

  if (!q) {
    return NextResponse.json({ tracks: [], playlists: [] });
  }

  const params = new URLSearchParams({
    q,
    type: "track,playlist",
    limit: String(Math.min(Math.max(limit, 5), 20)),
  });

  try {
    const data = await spotifyFetch<any>(`/search?${params.toString()}`);

    const tracks = (data.tracks?.items ?? []).map((track: any) => ({
      id: track.id,
      name: track.name,
      uri: track.uri,
      artists: track.artists?.map((a: any) => a.name).join(", ") ?? "",
      album: track.album?.name ?? "",
      image: track.album?.images?.[0]?.url ?? null,
    }));

    const playlists = (data.playlists?.items ?? []).map((pl: any) => ({
      id: pl.id,
      name: pl.name,
      uri: pl.uri,
      owner: pl.owner?.display_name ?? "",
      image: pl.images?.[0]?.url ?? null,
    }));

    return NextResponse.json({ tracks, playlists });
  } catch (error) {
    return NextResponse.json({ tracks: [], playlists: [], error: true });
  }
}
