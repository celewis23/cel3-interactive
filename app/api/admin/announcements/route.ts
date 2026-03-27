export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { logAudit, AuditAction } from "@/lib/audit/log";
import { sendPushNotificationToAudience } from "@/lib/notifications/push";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "announcements", "view");
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const includeArchived = searchParams.get("archived") === "true";
  const search = searchParams.get("q") ?? "";

  try {
    const now = new Date().toISOString();
    let filter = `_type == "announcement"`;
    if (!includeArchived) {
      filter += ` && archived != true && (expiryDate == null || expiryDate >= $now)`;
    }
    if (search) {
      filter += ` && (title match $search || body match $search)`;
    }

    const announcements = await sanityServer.fetch(
      `*[${filter}] | order(
        select(priority == "urgent" => 0, 1) asc,
        createdAt desc
      ){
        _id, title, body, priority, authorId, authorName,
        expiryDate, archived, createdAt,
        reactions[]{ _key, userId, userName, reactedAt },
        readBy
      }`,
      { now, search: search ? `${search}*` : "" }
    );

    return NextResponse.json(announcements);
  } catch (err) {
    console.error("ANNOUNCEMENTS_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "announcements", "post");
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { title, body: content, priority, expiryDate } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "title and body are required" }, { status: 400 });
    }

    const session = getSessionInfo(req);
    const authorId = session?.staffId ?? null;

    // Get author name from Sanity if staff, otherwise "Owner"
    let authorName = "Owner";
    if (authorId) {
      const staff = await sanityServer.fetch<{ name: string } | null>(
        `*[_type == "staffMember" && _id == $id][0]{ name }`,
        { id: authorId }
      );
      authorName = staff?.name ?? "Staff";
    }

    const announcement = await sanityWriteClient.create({
      _type: "announcement",
      title: title.trim(),
      body: content.trim(),
      priority: priority === "urgent" ? "urgent" : "normal",
      authorId,
      authorName,
      expiryDate: expiryDate ?? null,
      archived: false,
      reactions: [],
      readBy: [],
      createdAt: new Date().toISOString(),
    });

    logAudit(req, {
      action: AuditAction.SETTINGS_UPDATED,
      resourceType: "announcement",
      resourceId: announcement._id,
      resourceLabel: title.trim(),
      description: `Announcement "${title.trim()}" posted`,
    });

    // Best-effort: notify via Google Chat
    notifyChat(title.trim(), content.trim(), priority === "urgent").catch(() => {});
    sendPushNotificationToAudience(
      {
        title: title.trim(),
        body: content.trim(),
        href: "/admin/announcements",
        tag: `announcement:${announcement._id}`,
      },
      { module: "announcements", action: "view" }
    ).catch(console.error);

    return NextResponse.json(announcement, { status: 201 });
  } catch (err) {
    console.error("ANNOUNCEMENTS_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}

async function notifyChat(title: string, body: string, urgent: boolean) {
  try {
    const chatSpace = process.env.NOTIFICATION_CHAT_SPACE;
    if (!chatSpace) return;
    const { sendMessage } = await import("@/lib/google/chat");
    const prefix = urgent ? "🚨 *URGENT ANNOUNCEMENT*" : "📢 *New Announcement*";
    const snippet = body.length > 200 ? body.slice(0, 197) + "…" : body;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    await sendMessage(chatSpace, `${prefix}\n*${title}*\n${snippet}\n${siteUrl}/admin/announcements`);
  } catch { /* degrade gracefully */ }
}
