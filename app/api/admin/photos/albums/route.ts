export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { listAlbums } from "@/lib/google/photos";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const pageToken = searchParams.get("pageToken") ?? undefined;

  try {
    const result = await listAlbums(pageToken);
    return NextResponse.json(result);
  } catch (err) {
    console.error("PHOTOS_ALBUMS_ERROR:", err);
    return NextResponse.json({ error: "Failed to list albums" }, { status: 500 });
  }
}
