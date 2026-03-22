export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { listAlbums } from "@/lib/google/photos";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "photos", "view");
  if (authErr) return authErr;

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
