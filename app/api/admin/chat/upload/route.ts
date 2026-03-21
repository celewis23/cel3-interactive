export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { getAuthenticatedClient } from "@/lib/gmail/client";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

export async function POST(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const auth = await getAuthenticatedClient();
  if (!auth) return NextResponse.json({ error: "Not authenticated with Google" }, { status: 401 });

  try {
    const formData = await req.formData();
    const spaceName = formData.get("spaceName") as string;
    const file = formData.get("file") as File | null;
    const text = (formData.get("text") as string) || "";

    if (!spaceName || !file) {
      return NextResponse.json({ error: "spaceName and file are required" }, { status: 400 });
    }

    const accessToken = auth.oauth2Client.credentials.access_token;
    if (!accessToken) {
      return NextResponse.json({ error: "No access token available" }, { status: 401 });
    }

    const boundary = `ChatUpload${Date.now()}`;
    const metadata = JSON.stringify({ text });
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";

    // multipart/related body per Google API spec
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const url = `https://chat.googleapis.com/upload/v1/${spaceName}/messages?uploadType=multipart`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary="${boundary}"`,
      },
      body,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("CHAT_UPLOAD_ERROR:", response.status, errText);
      throw new Error(`Upload failed (${response.status}): ${errText}`);
    }

    const message = await response.json();
    return NextResponse.json(message);
  } catch (err) {
    console.error("CHAT_UPLOAD_ERROR:", err);
    const msg = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
