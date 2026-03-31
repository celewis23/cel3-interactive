export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getAuthenticatedClient } from "@/lib/gmail/client";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { sendPushNotificationToAudience } from "@/lib/notifications/push";

const STATE_DOC_ID = "email-notification-state";

function verifySecret(req: NextRequest): "ok" | "not_configured" | "wrong_secret" {
  const authHeader = req.headers.get("authorization");
  const secrets = [process.env.CRON_SECRET, process.env.NOTIFICATION_SECRET].filter(Boolean);
  if (secrets.length === 0) return "not_configured";
  return secrets.some((secret) => authHeader === `Bearer ${secret}`) ? "ok" : "wrong_secret";
}

function parseFrom(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: from, email: from };
}

export async function POST(req: NextRequest) {
  return handleNotificationCheck(req);
}

export async function GET(req: NextRequest) {
  return handleNotificationCheck(req);
}

async function handleNotificationCheck(req: NextRequest) {
  const authResult = verifySecret(req);
  if (authResult === "not_configured") {
    return NextResponse.json({ error: "NOTIFICATION_SECRET not configured on server" }, { status: 401 });
  }
  if (authResult === "wrong_secret") {
    return NextResponse.json({ error: "Unauthorized — secret mismatch" }, { status: 401 });
  }

  const notificationSpace = process.env.NOTIFICATION_CHAT_SPACE;

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

  const userChat = notificationSpace
    ? google.chat({ version: "v1", auth: auth.oauth2Client })
    : null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cel3interactive.com";

  let notified = 0;
  const errors: string[] = [];

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

      const fromLine = fromName !== fromEmail ? `${fromName} <${fromEmail}>` : fromEmail;
      const snippetLine = snippet ? `\n${snippet.length > 140 ? snippet.slice(0, 140) + "…" : snippet}` : "";
      const text = `📧 *New Email*\n*From:* ${fromLine}\n*Subject:* ${subject}${snippetLine}\n${siteUrl}/admin/email`;

      if (userChat && notificationSpace) {
        await userChat.spaces.messages.create({
          parent: notificationSpace,
          requestBody: { text },
        });
      }
      await sendPushNotificationToAudience(
        {
          title: subject,
          body: fromLine,
          href: "/admin/email",
          tag: `email:${msg.id}`,
        },
        { module: "email", action: "view" }
      );
      notified++;
    } catch (err) {
      const msg2 = err instanceof Error ? err.message : String(err);
      console.error("NOTIFY_EMAIL_ERROR:", msg.id, msg2);
      errors.push(msg2);
    }
  }

  return NextResponse.json({
    notified,
    total: messages.length,
    ...(notificationSpace ? { space: notificationSpace } : { space: null }),
    ...(errors.length ? { errors } : {}),
  });
}
