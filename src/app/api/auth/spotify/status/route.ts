import { NextResponse } from "next/server";
import { readTokenState } from "@/lib/spotify/server";

export async function GET() {
  const state = await readTokenState();
  const connected = Boolean(state.accessToken || state.refreshToken);
  return NextResponse.json({
    connected,
    expiresAt: state.expiresAt,
  });
}
