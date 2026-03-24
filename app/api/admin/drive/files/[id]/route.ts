export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { deleteFile, moveFile } from "@/lib/google/drive";
import { logAudit, AuditAction } from "@/lib/audit/log";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "drive", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const { newParentId, oldParentId } = await req.json() as {
      newParentId: string;
      oldParentId: string;
    };

    if (!newParentId || !oldParentId) {
      return NextResponse.json({ error: "newParentId and oldParentId required" }, { status: 400 });
    }

    const file = await moveFile(id, newParentId, oldParentId);

    logAudit(req, {
      action: AuditAction.FILE_UPLOADED,
      resourceType: "file",
      resourceId: id,
      resourceLabel: file.name,
      description: `Moved file: ${file.name}`,
    });

    return NextResponse.json(file);
  } catch (err) {
    console.error("DRIVE_MOVE_ERROR:", err);
    return NextResponse.json({ error: "Failed to move file" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "drive", "edit");
  if (authErr) return authErr;
  const { id } = await params;

  try {
    await deleteFile(id);
    logAudit(req, {
      action: AuditAction.FILE_DELETED,
      resourceType: "file",
      resourceId: id,
      description: "Drive file deleted",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DRIVE_DELETE_ERROR:", err);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}
