import { NextResponse } from "next/server";
import { clearTokenState } from "@/lib/spotify/server";

export async function POST() {
  await clearTokenState();
  return NextResponse.json({ ok: true });
}
