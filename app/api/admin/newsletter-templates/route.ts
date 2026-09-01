import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { createNewsletterTemplate, listNewsletterTemplates } from "@/lib/newsletters/db";

export const runtime = "nodejs";

const FONT_FALLBACK = "Inter, Arial, sans-serif";
const COLOR_RE = /^#[0-9a-f]{6}$/i;

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function cleanHtml(value: unknown) {
  return typeof value === "string" ? value : "";
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

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "settings", "view");
  if (authErr) return authErr;

  try {
    const templates = await listNewsletterTemplates();
    return NextResponse.json({ templates });
  } catch (err) {
    console.error("ADMIN_NEWSLETTER_TEMPLATES_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to load templates" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "settings", "edit");
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const name = cleanString(body.name);
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const template = await createNewsletterTemplate({
      name,
      description: cleanString(body.description) || null,
      headerHtml: cleanHtml(body.headerHtml),
      bodyHtml: cleanHtml(body.bodyHtml),
      footerHtml: cleanHtml(body.footerHtml),
      primaryColor: cleanColor(body.primaryColor, "#0ea5e9"),
      accentColor: cleanColor(body.accentColor, "#111827"),
      backgroundColor: cleanColor(body.backgroundColor, "#f8fafc"),
      textColor: cleanColor(body.textColor, "#111827"),
      fontFamily: cleanString(body.fontFamily, FONT_FALLBACK) || FONT_FALLBACK,
      backgroundImageUrl: cleanNullableUrl(body.backgroundImageUrl),
      videoUrl: cleanNullableUrl(body.videoUrl),
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (err) {
    console.error("ADMIN_NEWSLETTER_TEMPLATES_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
