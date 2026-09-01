import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import {
  deleteNewsletter,
  getNewsletterById,
  updateNewsletter,
  type NewsletterTargetType,
} from "@/lib/newsletters/db";
import { publishNewsletter } from "@/lib/newsletters/sender";

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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "settings", "view");
  if (authErr) return authErr;

  const { id } = await params;
  const newsletter = await getNewsletterById(id);
  if (!newsletter) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ newsletter });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "settings", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const newsletter = await getNewsletterById(id);
    if (!newsletter) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (newsletter.status === "publishing") {
      return NextResponse.json({ error: "Newsletter is currently publishing" }, { status: 400 });
    }

    const body = await req.json();

    if (body.action === "publish") {
      if (!newsletter.bodyHtml.trim()) {
        return NextResponse.json({ error: "Body content is required before publishing" }, { status: 400 });
      }
      const result = await publishNewsletter(id, { sendEmail: Boolean(body.sendEmail) });
      const updated = await getNewsletterById(id);
      return NextResponse.json({ newsletter: updated, ...result });
    }

    if (newsletter.status === "published" || newsletter.status === "sent") {
      return NextResponse.json({ error: "Published newsletters cannot be edited" }, { status: 400 });
    }

    const targetType = cleanTargetType(body.targetType);
    const updated = await updateNewsletter(id, {
      title: cleanString(body.title, newsletter.title),
      subject: cleanString(body.subject, newsletter.subject),
      summary: cleanString(body.summary) || null,
      headerHtml: typeof body.headerHtml === "string" ? body.headerHtml : newsletter.headerHtml,
      bodyHtml: typeof body.bodyHtml === "string" ? body.bodyHtml : newsletter.bodyHtml,
      footerHtml: typeof body.footerHtml === "string" ? body.footerHtml : newsletter.footerHtml,
      targetType,
      groupId: targetType === "group" ? cleanString(body.groupId) || null : null,
      primaryColor: cleanColor(body.primaryColor, newsletter.primaryColor),
      accentColor: cleanColor(body.accentColor, newsletter.accentColor),
      backgroundColor: cleanColor(body.backgroundColor, newsletter.backgroundColor),
      textColor: cleanColor(body.textColor, newsletter.textColor),
      fontFamily: cleanString(body.fontFamily, FONT_FALLBACK) || FONT_FALLBACK,
      backgroundImageUrl: cleanNullableUrl(body.backgroundImageUrl),
      videoUrl: cleanNullableUrl(body.videoUrl),
      sendEmail: Boolean(body.sendEmail),
    });

    return NextResponse.json({ newsletter: updated });
  } catch (err) {
    console.error("ADMIN_NEWSLETTER_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update newsletter" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "settings", "edit");
  if (authErr) return authErr;

  const { id } = await params;
  const newsletter = await getNewsletterById(id);
  if (!newsletter) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (newsletter.status === "publishing") {
    return NextResponse.json({ error: "Cannot delete while publishing" }, { status: 400 });
  }

  await deleteNewsletter(id);
  return NextResponse.json({ ok: true });
}
