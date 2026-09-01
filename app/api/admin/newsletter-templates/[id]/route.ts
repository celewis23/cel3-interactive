import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import {
  deleteNewsletterTemplate,
  getNewsletterTemplateById,
  updateNewsletterTemplate,
} from "@/lib/newsletters/db";

export const runtime = "nodejs";

const FONT_FALLBACK = "Inter, Arial, sans-serif";
const COLOR_RE = /^#[0-9a-f]{6}$/i;

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function cleanHtml(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "settings", "view");
  if (authErr) return authErr;

  const { id } = await params;
  const template = await getNewsletterTemplateById(id);
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ template });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "settings", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const current = await getNewsletterTemplateById(id);
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const name = cleanString(body.name, current.name);
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const template = await updateNewsletterTemplate(id, {
      name,
      description: cleanString(body.description) || null,
      headerHtml: cleanHtml(body.headerHtml, current.headerHtml),
      bodyHtml: cleanHtml(body.bodyHtml, current.bodyHtml),
      footerHtml: cleanHtml(body.footerHtml, current.footerHtml),
      primaryColor: cleanColor(body.primaryColor, current.primaryColor),
      accentColor: cleanColor(body.accentColor, current.accentColor),
      backgroundColor: cleanColor(body.backgroundColor, current.backgroundColor),
      textColor: cleanColor(body.textColor, current.textColor),
      fontFamily: cleanString(body.fontFamily, FONT_FALLBACK) || FONT_FALLBACK,
      backgroundImageUrl: cleanNullableUrl(body.backgroundImageUrl),
      videoUrl: cleanNullableUrl(body.videoUrl),
    });

    return NextResponse.json({ template });
  } catch (err) {
    console.error("ADMIN_NEWSLETTER_TEMPLATE_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "settings", "edit");
  if (authErr) return authErr;

  const { id } = await params;
  const template = await getNewsletterTemplateById(id);
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteNewsletterTemplate(id);
  return NextResponse.json({ ok: true });
}
