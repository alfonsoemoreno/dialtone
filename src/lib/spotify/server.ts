import { cookies } from "next/headers";

const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

const ACCESS_COOKIE = "spotify_access_token";
const REFRESH_COOKIE = "spotify_refresh_token";
const EXPIRES_COOKIE = "spotify_expires_at";

export type SpotifyTokenState = {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
};

const getCookie = async (name: string) => {
  const store = await cookies();
  return store.get(name)?.value ?? null;
};

export const readTokenState = async (): Promise<SpotifyTokenState> => {
  const accessToken = await getCookie(ACCESS_COOKIE);
  const refreshToken = await getCookie(REFRESH_COOKIE);
  const expiresAtRaw = await getCookie(EXPIRES_COOKIE);
  const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : null;
  return { accessToken, refreshToken, expiresAt };
};

export const setTokenState = async (
  accessToken: string,
  refreshToken: string | null,
  expiresIn: number
) => {
  const store = await cookies();
  const expiresAt = Date.now() + expiresIn * 1000;
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  store.set(ACCESS_COOKIE, accessToken, options);
  if (refreshToken) {
    store.set(REFRESH_COOKIE, refreshToken, options);
  }
  store.set(EXPIRES_COOKIE, String(expiresAt), options);
};

export const clearTokenState = async () => {
  const store = await cookies();
  const options = { path: "/" };
  store.set(ACCESS_COOKIE, "", options);
  store.set(REFRESH_COOKIE, "", options);
  store.set(EXPIRES_COOKIE, "", options);
};

export const refreshAccessToken = async (refreshToken: string) => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing SPOTIFY_CLIENT_ID");
  }

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    throw new Error("Failed to refresh Spotify token");
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  setTokenState(data.access_token, data.refresh_token ?? refreshToken, data.expires_in);
  return data.access_token;
};

export const getValidAccessToken = async () => {
  const state = await readTokenState();
  if (state.accessToken && state.expiresAt && state.expiresAt > Date.now() + 60000) {
    return state.accessToken;
  }
  if (state.refreshToken) {
    return refreshAccessToken(state.refreshToken);
  }
  return null;
};
