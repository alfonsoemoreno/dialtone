import { NextResponse } from "next/server";
import { getValidAccessToken } from "@/lib/spotify/server";

export async function GET() {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return NextResponse.json({ accessToken: null }, { status: 401 });
  }
  return NextResponse.json({ accessToken });
}
