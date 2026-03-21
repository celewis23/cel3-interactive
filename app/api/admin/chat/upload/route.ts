export const runtime = "nodejs";

import { Readable } from "stream";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { getAuthenticatedClient } from "@/lib/gmail/client";
import { sanityWriteClient } from "@/lib/sanity.write";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

function getBotAuth() {
  const raw = process.env.GOOGLE_CHAT_BOT_CREDENTIALS;
  if (!raw) throw new Error("GOOGLE_CHAT_BOT_CREDENTIALS not configured");
  const credentials = JSON.parse(raw);
  return {
    auth: new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/chat.bot"],
    }),
    clientId: credentials.client_id as string,
  };
}

function normalizeMessage(m: {
  name?: string | null;
  text?: string | null;
  formattedText?: string | null;
  sender?: { name?: string | null; displayName?: string | null; type?: string | null } | null;
  createTime?: string | null;
}) {
  return {
    name: m.name ?? "",
    text: m.text ?? undefined,
    formattedText: m.formattedText ?? undefined,
    sender: {
      name: m.sender?.name ?? "",
      displayName: m.sender?.displayName ?? undefined,
      type: m.sender?.type ?? undefined,
    },
    createTime: m.createTime ?? "",
  };
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
    const isImage = mimeType.startsWith("image/");

    if (isImage) {
      // Upload to Sanity CDN for a permanent public URL
      const asset = await sanityWriteClient.assets.upload(
        "image",
        Readable.from(fileBuffer),
        { filename: fileName, contentType: mimeType }
      );
      const imageUrl = asset.url;

      // Build cardsV2 message — only bots can send these (inline image in Chat)
      const cardMessage = {
        ...(text.trim() ? { text: text.trim() } : {}),
        cardsV2: [{
          cardId: `img-${Date.now()}`,
          card: {
            sections: [{
              widgets: [{
                image: {
                  imageUrl,
                  altText: fileName,
                  onClick: { openLink: { url: imageUrl } },
                },
              }],
            }],
          },
        }],
      };

      // Attempt 1: send via bot
      try {
        const { auth: botAuth, clientId } = getBotAuth();
        const botChat = google.chat({ version: "v1", auth: botAuth });

        try {
          const msgRes = await botChat.spaces.messages.create({
            parent: spaceName,
            requestBody: cardMessage,
          });
          return NextResponse.json(normalizeMessage(msgRes.data));
        } catch (botErr: unknown) {
          // Bot not in space — add it via user OAuth then retry
          const code = (botErr as { code?: number })?.code;
          if (code === 403 || code === 404) {
            const userChat = google.chat({ version: "v1", auth: auth.oauth2Client });
            await userChat.spaces.members.create({
              parent: spaceName,
              requestBody: {
                member: { name: `users/${clientId}`, type: "BOT" },
              },
            });
            const msgRes = await botChat.spaces.messages.create({
              parent: spaceName,
              requestBody: cardMessage,
            });
            return NextResponse.json(normalizeMessage(msgRes.data));
          }
          throw botErr;
        }
      } catch (err) {
        // Bot unavailable — fall back to text message with image URL
        console.warn("CHAT_BOT_FALLBACK:", err);
        const userChat = google.chat({ version: "v1", auth: auth.oauth2Client });
        const fallbackText = text.trim() ? `${text.trim()}\n${imageUrl}` : imageUrl;
        const msgRes = await userChat.spaces.messages.create({
          parent: spaceName,
          requestBody: { text: fallbackText },
        });
        return NextResponse.json(normalizeMessage(msgRes.data));
      }
    }

    // Non-image: upload to Drive with link sharing
    const drive = google.drive({ version: "v3", auth: auth.oauth2Client });
    const driveRes = await drive.files.create({
      requestBody: { name: fileName, mimeType },
      media: { mimeType, body: Readable.from(fileBuffer) },
      fields: "id,webViewLink",
    });
    const fileId = driveRes.data.id;
    const webViewLink = driveRes.data.webViewLink;
    if (!fileId || !webViewLink) throw new Error("Drive upload returned no file ID");

    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
    });

    const userChat = google.chat({ version: "v1", auth: auth.oauth2Client });
    const msgText = text.trim() ? `${text.trim()}\n${webViewLink}` : `${fileName}: ${webViewLink}`;
    const msgRes = await userChat.spaces.messages.create({
      parent: spaceName,
      requestBody: { text: msgText },
    });
    return NextResponse.json(normalizeMessage(msgRes.data));

  } catch (err) {
    console.error("CHAT_UPLOAD_ERROR:", err);
    const msg = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
