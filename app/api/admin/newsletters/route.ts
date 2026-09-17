import { withActivity } from "@/lib/audit/withActivity";
import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { createNewsletter, listNewsletters, type NewsletterTargetType } from "@/lib/newsletters/db";

export const runtime = "nodejs";

const FONT_FALLBACK = "Inter, Arial, sans-serif";
const COLOR_RE = /^#[0-9a-f]{6}$/i;

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function cleanColor(value: unknown, fallback: string) {
  const cleaned = cleanString(value);
  return COLOR_RE.test(cleaned) ? cleaned : fallback;
}

function cleanNullableUrl(value: unknown) {
  const cleaned = cleanString(value);
  if (!cleaned) return null;
  try {
    const url = new URL(cleaned);
    return url.protocol === "http:" || url.protocol === "https:" ? cleaned : null;
  } catch {
    return null;
  }
}

function cleanTargetType(value: unknown): NewsletterTargetType {
  return value === "group" ? "group" : "portal_users";
}

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "settings", "view");
  if (authErr) return authErr;

  try {
    const newsletters = await listNewsletters();
    return NextResponse.json({ newsletters });
  } catch (err) {
    console.error("ADMIN_NEWSLETTERS_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to load newsletters" }, { status: 500 });
  }
}

async function handleActivityPOST(req: NextRequest) {
  const authErr = await requirePermission(req, "settings", "edit");
  if (authErr) return authErr;

  try {
    const session = getSessionInfo(req);
    const body = await req.json();
    const title = cleanString(body.title);
    const subject = cleanString(body.subject);

    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    if (!subject) return NextResponse.json({ error: "Subject is required" }, { status: 400 });

    const targetType = cleanTargetType(body.targetType);
    const newsletter = await createNewsletter({
      title,
      subject,
      summary: cleanString(body.summary) || null,
      headerHtml: typeof body.headerHtml === "string" ? body.headerHtml : "",
      bodyHtml: typeof body.bodyHtml === "string" ? body.bodyHtml : "",
      footerHtml: typeof body.footerHtml === "string" ? body.footerHtml : "",
      targetType,
      groupId: targetType === "group" ? cleanString(body.groupId) || null : null,
      primaryColor: cleanColor(body.primaryColor, "#0ea5e9"),
      accentColor: cleanColor(body.accentColor, "#111827"),
      backgroundColor: cleanColor(body.backgroundColor, "#f8fafc"),
      textColor: cleanColor(body.textColor, "#111827"),
      fontFamily: cleanString(body.fontFamily, FONT_FALLBACK) || FONT_FALLBACK,
      backgroundImageUrl: cleanNullableUrl(body.backgroundImageUrl),
      videoUrl: cleanNullableUrl(body.videoUrl),
      sendEmail: Boolean(body.sendEmail),
      createdByAdminId: session?.staffId ?? "owner",
    });

    return NextResponse.json({ newsletter }, { status: 201 });
  } catch (err) {
    console.error("ADMIN_NEWSLETTERS_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to create newsletter" }, { status: 500 });
  }
}

export const POST = withActivity("/api/admin/newsletters", "POST", handleActivityPOST);
