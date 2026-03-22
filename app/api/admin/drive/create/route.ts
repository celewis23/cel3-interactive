export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { createGoogleDoc, createGoogleSheet } from "@/lib/google/drive";
import { logAudit, AuditAction } from "@/lib/audit/log";

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "drive", "edit");
  if (authErr) return authErr;

  try {
    const { type, name, folderId } = await req.json() as {
      type: "doc" | "sheet";
      name?: string;
      folderId?: string;
    };

    const file =
      type === "sheet"
        ? await createGoogleSheet(name?.trim() || "Untitled spreadsheet", folderId)
        : await createGoogleDoc(name?.trim() || "Untitled document", folderId);

    logAudit(req, {
      action: AuditAction.FILE_UPLOADED,
      resourceType: type === "sheet" ? "sheet" : "doc",
      resourceId: file.id,
      resourceLabel: file.name,
      description: `Created Google ${type === "sheet" ? "Sheet" : "Doc"}: ${file.name}`,
    });

    return NextResponse.json(file, { status: 201 });
  } catch (err) {
    console.error("DRIVE_CREATE_ERR:", err);
    return NextResponse.json({ error: "Failed to create file" }, { status: 500 });
  }
}
