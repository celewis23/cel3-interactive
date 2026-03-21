export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getAuthenticatedClient } from "@/lib/gmail/client";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

const STATE_DOC_ID = "email-notification-state";

function verifySecret(req: NextRequest): "ok" | "not_configured" | "wrong_secret" {
  const secret = process.env.NOTIFICATION_SECRET;
  if (!secret) return "not_configured";
  return req.headers.get("authorization") === `Bearer ${secret}` ? "ok" : "wrong_secret";
}

function parseFrom(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: from, email: from };
}

export async function POST(req: NextRequest) {
  const authResult = verifySecret(req);
  if (authResult === "not_configured") {
    return NextResponse.json({ error: "NOTIFICATION_SECRET not configured on server" }, { status: 401 });
  }
  if (authResult === "wrong_secret") {
    return NextResponse.json({ error: "Unauthorized — secret mismatch" }, { status: 401 });
  }

  const notificationSpace = process.env.NOTIFICATION_CHAT_SPACE;
  if (!notificationSpace) {
    return NextResponse.json({ error: "NOTIFICATION_CHAT_SPACE not configured" }, { status: 500 });
  }

  const auth = await getAuthenticatedClient();
  if (!auth) {
    return NextResponse.json({ error: "Google not authenticated" }, { status: 500 });
  }

  // Get last checked timestamp (default: 5 min ago on first run)
  const state = await sanityServer
    .getDocument<{ lastCheckedAt: string }>(STATE_DOC_ID)
    .catch(() => null);
  const lastCheckedAt = state?.lastCheckedAt
    ? new Date(state.lastCheckedAt)
    : new Date(Date.now() - 5 * 60 * 1000);
  const nowISO = new Date().toISOString();

  // Advance the timestamp immediately so re-runs don't re-notify
  await sanityWriteClient.createOrReplace({
    _id: STATE_DOC_ID,
    _type: "notificationState",
    lastCheckedAt: nowISO,
  });

  // Fetch emails received since last check
  const gmail = google.gmail({ version: "v1", auth: auth.oauth2Client });
  const afterSec = Math.floor(lastCheckedAt.getTime() / 1000);
  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: `in:inbox after:${afterSec}`,
    maxResults: 10,
  });
  const messages = listRes.data.messages ?? [];
  if (messages.length === 0) return NextResponse.json({ notified: 0 });

  // Bot auth
  const botCredentials = JSON.parse(process.env.GOOGLE_CHAT_BOT_CREDENTIALS!);
  const botAuth = new google.auth.GoogleAuth({
    credentials: botCredentials,
    scopes: ["https://www.googleapis.com/auth/chat.bot"],
  });
  const botChat = google.chat({ version: "v1", auth: botAuth });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cel3interactive.com";

  // Ensure bot is in the notification space — silently ignored if already a member
  try {
    const userChat = google.chat({ version: "v1", auth: auth.oauth2Client });
    await userChat.spaces.members.create({
      parent: notificationSpace,
      requestBody: {
        member: { name: `users/${botCredentials.client_id}`, type: "BOT" },
      },
    });
  } catch { /* already a member or insufficient permission — proceed anyway */ }

  let notified = 0;
  for (const msg of messages) {
    try {
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "metadata",
        metadataHeaders: ["From", "Subject"],
      });
      const headers = detail.data.payload?.headers ?? [];
      const fromRaw = headers.find((h) => h.name === "From")?.value ?? "Unknown";
      const subject = headers.find((h) => h.name === "Subject")?.value ?? "(no subject)";
      const snippet = detail.data.snippet ?? "";
      const { name: fromName, email: fromEmail } = parseFrom(fromRaw);

      await botChat.spaces.messages.create({
        parent: notificationSpace,
        requestBody: {
          cardsV2: [{
            cardId: `email-${msg.id}`,
            card: {
              header: { title: "New Email", subtitle: fromEmail },
              sections: [{
                widgets: [
                  {
                    decoratedText: {
                      topLabel: "From",
                      text: fromName !== fromEmail ? `${fromName} &lt;${fromEmail}&gt;` : fromEmail,
                    },
                  },
                  {
                    decoratedText: {
                      topLabel: "Subject",
                      text: subject,
                    },
                  },
                  ...(snippet ? [{
                    textParagraph: {
                      text: snippet.length > 140 ? snippet.slice(0, 140) + "…" : snippet,
                    },
                  }] : []),
                  {
                    buttonList: {
                      buttons: [{
                        text: "Open in Backoffice",
                        onClick: { openLink: { url: `${siteUrl}/admin/email` } },
                      }],
                    },
                  },
                ],
              }],
            },
          }],
        },
      });
      notified++;
    } catch (err) {
      console.error("NOTIFY_EMAIL_ERROR:", msg.id, err);
    }
  }

  return NextResponse.json({ notified, total: messages.length });
}
