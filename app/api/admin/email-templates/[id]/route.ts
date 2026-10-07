import { withActivity } from "@/lib/audit/withActivity";
import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import {
  deleteEmailTemplate,
  getEmailTemplateById,
  updateEmailTemplate,
} from "@/lib/emailTemplates/db";

export const runtime = "nodejs";

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function cleanHtml(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "email", "view");
  if (authErr) return authErr;

  const { id } = await params;
  const template = await getEmailTemplateById(id);
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ template });
}

async function handleActivityPATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "email", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const current = await getEmailTemplateById(id);
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const name = cleanString(body.name, current.name);
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const template = await updateEmailTemplate(id, {
      name,
      description: cleanString(body.description) || null,
      html: cleanHtml(body.html, current.html),
    });

    return NextResponse.json({ template });
  } catch (err) {
    console.error("ADMIN_EMAIL_TEMPLATE_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

async function handleActivityDELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "email", "edit");
  if (authErr) return authErr;

  const { id } = await params;
  const template = await getEmailTemplateById(id);
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteEmailTemplate(id);
  return NextResponse.json({ ok: true });
}

export const PATCH = withActivity("/api/admin/email-templates/[id]", "PATCH", handleActivityPATCH);

export const DELETE = withActivity("/api/admin/email-templates/[id]", "DELETE", handleActivityDELETE);
