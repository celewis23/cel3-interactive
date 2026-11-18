import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin/permissions";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Sign in to download the Android console" }, { status: 401 });
  try {
    const apk = await readFile(path.join(process.cwd(), "public/downloads/meterwise.apk"));
    return new NextResponse(apk, { headers: {
      "Content-Type": "application/vnd.android.package-archive",
      "Content-Disposition": 'attachment; filename="cel3-backoffice.apk"', "Cache-Control": "no-store",
    } });
  } catch {
    return NextResponse.json({ error: "The Android console package is not available yet" }, { status: 404 });
  }
}
