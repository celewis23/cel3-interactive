import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { requirePermission } from "@/lib/admin/permissions";

export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const denied = await requirePermission(req, "meterwise", "view");
  if (denied) return denied;
  try {
    const apk = await readFile(path.join(process.cwd(), "public/downloads/meterwise.apk"));
    return new NextResponse(apk, { headers: {
      "Content-Type": "application/vnd.android.package-archive",
      "Content-Disposition": 'attachment; filename="meterwise.apk"', "Cache-Control": "no-store",
    } });
  } catch {
    return NextResponse.json({ error: "The Android app has not been published yet. Please check back after the APK is built and deployed." }, { status: 404 });
  }
}
