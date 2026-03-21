export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { createFolder } from "@/lib/google/drive";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

export async function POST(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
