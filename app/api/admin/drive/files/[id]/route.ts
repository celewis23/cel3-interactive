export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { deleteFile } from "@/lib/google/drive";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "drive", "edit");
  if (authErr) return authErr;
  const { id } = await params;

  try {
    await deleteFile(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DRIVE_DELETE_ERROR:", err);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}
