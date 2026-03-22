export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { exportDriveFile } from "@/lib/google/drive";

type Params = { params: Promise<{ id: string }> };

const EXPORT_MIME: Record<string, string> = {
  pdf:  "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv:  "text/csv",
  txt:  "text/plain",
};

const EXPORT_EXT: Record<string, string> = {
  pdf:  ".pdf",
  docx: ".docx",
  xlsx: ".xlsx",
  csv:  ".csv",
  txt:  ".txt",
};

export async function GET(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "drive", "view");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const format = new URL(req.url).searchParams.get("format") ?? "pdf";
    const mimeType = EXPORT_MIME[format] ?? EXPORT_MIME.pdf;
    const ext = EXPORT_EXT[format] ?? ".pdf";

    const { data, name } = await exportDriveFile(id, mimeType);
    const safeName = name.replace(/[^\w\s.-]/g, "").trim() || "document";

    return new NextResponse(data, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${safeName}${ext}"`,
        "Content-Length": String(data.length),
      },
    });
  } catch (err) {
    console.error("DRIVE_EXPORT_ERR:", err);
    return NextResponse.json({ error: "Failed to export file" }, { status: 500 });
  }
}
