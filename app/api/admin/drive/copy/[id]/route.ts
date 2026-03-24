export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { copyFile } from "@/lib/google/drive";
import { logAudit, AuditAction } from "@/lib/audit/log";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "drive", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const { name, parentId } = await req.json() as { name?: string; parentId?: string };

    const file = await copyFile(id, name, parentId);

    logAudit(req, {
      action: AuditAction.FILE_UPLOADED,
      resourceType: "file",
      resourceId: file.id,
      resourceLabel: file.name,
      description: `Copied file: ${file.name}`,
    });

    return NextResponse.json(file, { status: 201 });
  } catch (err) {
    console.error("DRIVE_COPY_ERROR:", err);
    return NextResponse.json({ error: "Failed to copy file" }, { status: 500 });
  }
}
