export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { listFiles, uploadFile } from "@/lib/google/drive";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folderId") ?? undefined;
  const pageToken = searchParams.get("pageToken") ?? undefined;

  try {
    const result = await listFiles({ folderId, pageToken });
    return NextResponse.json(result);
  } catch (err) {
    console.error("DRIVE_LIST_ERROR:", err);
    return NextResponse.json({ error: "Failed to list files" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("DRIVE_UPLOAD_ERROR:", err);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
