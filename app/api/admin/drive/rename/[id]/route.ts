export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { renameFile } from "@/lib/google/drive";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "drive", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const { name } = await req.json() as { name: string };
    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const file = await renameFile(id, name.trim());
    return NextResponse.json(file);
  } catch (err) {
    console.error("DRIVE_RENAME_ERR:", err);
    return NextResponse.json({ error: "Failed to rename file" }, { status: 500 });
  }
}
