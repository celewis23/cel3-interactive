import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { logAudit, AuditAction } from "@/lib/audit/log";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "staffManagement", "view");
  if (authErr) return authErr;

  const roles = await sanityServer.fetch(
    `*[_type == "staffRole"] | order(name asc){
      _id, name, slug, isSystem, permissions, _createdAt
    }`
  );
  return NextResponse.json(roles);
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "staffManagement", "manage");
  if (authErr) return authErr;

  const body = await req.json();
  const { name, slug, permissions } = body;

  if (!name?.trim() || !slug?.trim()) {
    return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
  }

  // Ensure slug is unique
  const existing = await sanityServer.fetch(
    `*[_type == "staffRole" && slug == $slug][0]._id`,
    { slug: slug.trim() }
  );
  if (existing) {
    return NextResponse.json({ error: "A role with this slug already exists" }, { status: 409 });
  }

  const role = await sanityWriteClient.create({
    _type: "staffRole",
    name: name.trim(),
    slug: slug.trim().toLowerCase().replace(/\s+/g, "-"),
    isSystem: false,
    permissions: permissions ?? {},
  });

  logAudit(req, {
    action: AuditAction.ROLE_CREATED,
    resourceType: "staffRole",
    resourceId: role._id,
    resourceLabel: body.name,
    description: `Role "${body.name}" created`,
  });

  return NextResponse.json(role, { status: 201 });
}
