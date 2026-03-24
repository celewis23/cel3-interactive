export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { downloadFileContent } from "@/lib/google/drive";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "drive", "view");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const { data, name, mimeType } = await downloadFileContent(id);

    const safeName = name.replace(/[^\w\s.\-()]/g, "").trim() || "file";

    return new NextResponse(data.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Content-Length": String(data.length),
      },
    });
  } catch (err) {
    console.error("DRIVE_DOWNLOAD_ERROR:", err);
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }
}
