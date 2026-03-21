export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { deleteFile } from "@/lib/google/drive";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    await deleteFile(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DRIVE_DELETE_ERROR:", err);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}
