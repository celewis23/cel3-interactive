export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { listMediaItems } from "@/lib/google/photos";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const albumId = searchParams.get("albumId") ?? undefined;
  const pageToken = searchParams.get("pageToken") ?? undefined;
  const pageSizeParam = searchParams.get("pageSize");
  const pageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : undefined;

  try {
    const result = await listMediaItems({ albumId, pageToken, pageSize });
    return NextResponse.json(result);
  } catch (err) {
    console.error("PHOTOS_MEDIA_ERROR:", err);
    return NextResponse.json({ error: "Failed to list media" }, { status: 500 });
  }
}
