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
    type: "track,playlist,album",
    limit: String(Math.min(Math.max(limit, 5), 20)),
    market: "from_token",
  });

  try {
    let data = await spotifyFetch<any>(`/search?${params.toString()}`);

    const hasAny =
      (data.tracks?.items?.length ?? 0) +
        (data.playlists?.items?.length ?? 0) +
        (data.albums?.items?.length ?? 0) >
      0;

    if (!hasAny) {
      const fallbackParams = new URLSearchParams({
        q: `artist:${q}`,
        type: "track,album",
        limit: String(Math.min(Math.max(limit, 5), 20)),
        market: "from_token",
      });
      data = await spotifyFetch<any>(`/search?${fallbackParams.toString()}`);
    }

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

    const albums = (data.albums?.items ?? []).map((album: any) => ({
      id: album.id,
      name: album.name,
      uri: album.uri,
      artists: album.artists?.map((a: any) => a.name).join(", ") ?? "",
      image: album.images?.[0]?.url ?? null,
    }));

    return NextResponse.json({ tracks, playlists, albums });
  } catch (error) {
    return NextResponse.json({ tracks: [], playlists: [], albums: [], error: true });
  }
}
