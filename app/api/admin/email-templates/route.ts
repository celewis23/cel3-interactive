import { withActivity } from "@/lib/audit/withActivity";
import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { createEmailTemplate, listEmailTemplates } from "@/lib/emailTemplates/db";

export const runtime = "nodejs";

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function cleanHtml(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "email", "view");
  if (authErr) return authErr;

  try {
    const templates = await listEmailTemplates();
    return NextResponse.json({ templates });
  } catch (err) {
    console.error("ADMIN_EMAIL_TEMPLATES_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to load templates" }, { status: 500 });
  }
}

async function handleActivityPOST(req: NextRequest) {
  const authErr = await requirePermission(req, "email", "edit");
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const name = cleanString(body.name);
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const template = await createEmailTemplate({
      name,
      description: cleanString(body.description) || null,
      html: cleanHtml(body.html),
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (err) {
    console.error("ADMIN_EMAIL_TEMPLATES_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}

export const POST = withActivity("/api/admin/email-templates", "POST", handleActivityPOST);
