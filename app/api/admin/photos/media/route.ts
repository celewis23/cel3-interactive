export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { listMediaItems } from "@/lib/google/photos";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "photos", "view");
  if (authErr) return authErr;

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
