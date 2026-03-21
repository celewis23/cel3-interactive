export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { getAuthenticatedClient } from "@/lib/gmail/client";
import { google } from "googleapis";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireAuth(req))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: fileId } = await params;
  const auth = await getAuthenticatedClient();
  if (!auth)
    return NextResponse.json({ error: "Not authenticated with Google" }, { status: 401 });

  const drive = google.drive({ version: "v3", auth: auth.oauth2Client });

  try {
    const meta = await drive.files.get({ fileId, fields: "mimeType" });
    const mimeType = meta.data.mimeType ?? "image/jpeg";

    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );

    const buffer = Buffer.from(res.data as ArrayBuffer);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("PHOTOS_FILE_ERROR:", err);
    return NextResponse.json({ error: "Failed to fetch file" }, { status: 500 });
  }
}
