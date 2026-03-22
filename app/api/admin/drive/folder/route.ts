export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { createFolder } from "@/lib/google/drive";

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "drive", "edit");
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { name, parentId } = body as { name: string; parentId?: string };

    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const folder = await createFolder(name, parentId);
    return NextResponse.json(folder, { status: 201 });
  } catch (err) {
    console.error("DRIVE_FOLDER_ERROR:", err);
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
  }
}
