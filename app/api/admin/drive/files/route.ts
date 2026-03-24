export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { listFiles, uploadFile } from "@/lib/google/drive";
import { logAudit, AuditAction } from "@/lib/audit/log";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "drive", "view");
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const folderId    = searchParams.get("folderId")    ?? undefined;
  const pageToken   = searchParams.get("pageToken")   ?? undefined;
  const search      = searchParams.get("q")            ?? undefined;
  const foldersOnly = searchParams.get("foldersOnly") === "true";

  try {
    const result = await listFiles({ folderId, pageToken, search, foldersOnly });
    return NextResponse.json(result);
  } catch (err) {
    console.error("DRIVE_LIST_ERROR:", err);
    return NextResponse.json({ error: "Failed to list files" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "drive", "edit");
  if (authErr) return authErr;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folderId = formData.get("folderId") as string | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const data = Buffer.from(arrayBuffer);

    const result = await uploadFile({
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      data,
      parentId: folderId ?? undefined,
    });

    logAudit(req, {
      action: AuditAction.FILE_UPLOADED,
      resourceType: "file",
      description: "File uploaded",
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("DRIVE_UPLOAD_ERROR:", err);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
