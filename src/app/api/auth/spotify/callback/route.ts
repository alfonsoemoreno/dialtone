import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { setTokenState } from "@/lib/spotify/server";

const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const VERIFIER_COOKIE = "spotify_pkce_verifier";
const STATE_COOKIE = "spotify_auth_state";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const store = await cookies();
  const verifier = store.get(VERIFIER_COOKIE)?.value;
  const storedState = store.get(STATE_COOKIE)?.value;

  if (!code || !verifier || !state || state !== storedState) {
    return NextResponse.redirect(new URL("/player?spotify=error", request.url));
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.redirect(new URL("/player?spotify=error", request.url));
  }

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: verifier,
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    return NextResponse.redirect(new URL("/player?spotify=error", request.url));
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  await setTokenState(data.access_token, data.refresh_token ?? null, data.expires_in);
  store.set(VERIFIER_COOKIE, "", { path: "/" });
  store.set(STATE_COOKIE, "", { path: "/" });

  return NextResponse.redirect(new URL("/player?spotify=connected", request.url));
}
