import { getValidAccessToken } from "@/lib/spotify/server";

const API_BASE = "https://api.spotify.com/v1";

export const spotifyFetch = async <T>(
  path: string,
  init?: RequestInit
): Promise<T> => {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error("Spotify not connected");
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Spotify API error");
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
};
