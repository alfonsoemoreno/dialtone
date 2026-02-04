import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";

const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const VERIFIER_COOKIE = "spotify_pkce_verifier";
const STATE_COOKIE = "spotify_auth_state";

const base64Url = (buffer: Buffer) =>
  buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Missing SPOTIFY_CLIENT_ID or SPOTIFY_REDIRECT_URI" },
      { status: 500 }
    );
  }

  const verifier = base64Url(crypto.randomBytes(64));
  const challenge = base64Url(
    crypto.createHash("sha256").update(verifier).digest()
  );
  const state = base64Url(crypto.randomBytes(16));

  const store = await cookies();
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };

  store.set(VERIFIER_COOKIE, verifier, options);
  store.set(STATE_COOKIE, state, options);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
    scope: [
      "streaming",
      "user-read-email",
      "user-read-private",
      "user-read-playback-state",
      "user-modify-playback-state",
    ].join(" "),
  });

  return NextResponse.redirect(`${AUTH_ENDPOINT}?${params.toString()}`);
}
