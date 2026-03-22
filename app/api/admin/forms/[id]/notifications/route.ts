import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityWriteClient } from "@/lib/sanity.write";
import { sanityServer } from "@/lib/sanityServer";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "forms", "view");
  if (authErr) return authErr;
  const { id } = await params;
  const notifications = await sanityServer.fetch(
    `*[_type == "cel3FormNotification" && formId == $id] | order(sortOrder asc)`,
    { id }
  );
  return NextResponse.json(notifications);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "forms", "edit");
  if (authErr) return authErr;
  const { id } = await params;
  const body = await req.json();

  const email = String(body.emailAddress || "").trim();
  if (!email) return NextResponse.json({ error: "Email address is required" }, { status: 400 });

  const existing = await sanityServer.fetch<Array<{ sortOrder: number }>>(
    `*[_type == "cel3FormNotification" && formId == $id]{ sortOrder }`,
    { id }
  );
  const nextOrder = existing.length > 0 ? Math.max(...existing.map(n => n.sortOrder ?? 0)) + 1 : 0;

  const created = await sanityWriteClient.create({
    _type: "cel3FormNotification",
    formId: id,
    emailAddress: email,
    label: String(body.label || "").trim(),
    isActive: body.isActive ?? true,
    notifyOnEverySubmission: body.notifyOnEverySubmission ?? true,
    includeFileLinks: body.includeFileLinks ?? true,
    sortOrder: nextOrder,
  });

  return NextResponse.json(created, { status: 201 });
}
