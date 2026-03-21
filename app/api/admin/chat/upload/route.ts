export const runtime = "nodejs";

import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
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

    const mimeType = file.type || "application/octet-stream";
    const fileName = file.name || `attachment_${Date.now()}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // 1. Upload to Drive
    const drive = google.drive({ version: "v3", auth: auth.oauth2Client });
    const driveRes = await drive.files.create({
      requestBody: { name: fileName, mimeType },
      media: { mimeType, body: Readable.from(fileBuffer) },
      fields: "id,webViewLink,name",
    });

    const fileId = driveRes.data.id;
    const webViewLink = driveRes.data.webViewLink;
    if (!fileId || !webViewLink) throw new Error("Drive upload returned no file ID");

    // 2. Make accessible to anyone with the link (so recipients can open it)
    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
    });

    // 3. Send Chat message with the Drive link
    const chat = google.chat({ version: "v1", auth: auth.oauth2Client });
    const messageText = text.trim()
      ? `${text.trim()}\n${webViewLink}`
      : `${fileName}: ${webViewLink}`;

    const msgRes = await chat.spaces.messages.create({
      parent: spaceName,
      requestBody: { text: messageText },
    });

    const m = msgRes.data;
    return NextResponse.json({
      name: m.name ?? "",
      text: m.text ?? undefined,
      formattedText: m.formattedText ?? undefined,
      sender: {
        name: m.sender?.name ?? "",
        displayName: m.sender?.displayName ?? undefined,
        type: m.sender?.type ?? undefined,
      },
      createTime: m.createTime ?? "",
    });
  } catch (err) {
    console.error("CHAT_UPLOAD_ERROR:", err);
    const msg = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
