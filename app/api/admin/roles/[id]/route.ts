import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { invalidateRoleCache } from "@/lib/admin/permissions";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "staffManagement", "view");
  if (authErr) return authErr;

  const { id } = await params;
  const role = await sanityServer.fetch(
    `*[_type == "staffRole" && _id == $id][0]`,
    { id }
  );
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(role);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "staffManagement", "manage");
  if (authErr) return authErr;

  const { id } = await params;
  const body = await req.json();

  const role = await sanityServer.fetch<{ isSystem: boolean; slug: string } | null>(
    `*[_type == "staffRole" && _id == $id][0]{ isSystem, slug }`,
    { id }
  );
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allowed: Record<string, unknown> = {};
  // System roles: only permissions can be updated, not name/slug/isSystem
  if (!role.isSystem && body.name !== undefined) allowed.name = String(body.name).trim();
  if (!role.isSystem && body.slug !== undefined) {
    allowed.slug = String(body.slug).trim().toLowerCase().replace(/\s+/g, "-");
  }
  if (body.permissions !== undefined) allowed.permissions = body.permissions;

  const updated = await sanityWriteClient.patch(id).set(allowed).commit();
  invalidateRoleCache(role.slug);
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "staffManagement", "manage");
  if (authErr) return authErr;

  const { id } = await params;
  const role = await sanityServer.fetch<{ isSystem: boolean; slug: string; name: string } | null>(
    `*[_type == "staffRole" && _id == $id][0]{ isSystem, slug, name }`,
    { id }
  );
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (role.isSystem) {
    return NextResponse.json({ error: "System roles cannot be deleted" }, { status: 409 });
  }

  // Check if any staff member uses this role
  const inUse = await sanityServer.fetch<number>(
    `count(*[_type == "staffMember" && roleSlug == $slug])`,
    { slug: role.slug }
  );
  if (inUse > 0) {
    return NextResponse.json(
      { error: `Cannot delete — ${inUse} staff member(s) are using this role` },
      { status: 409 }
    );
  }

  await sanityWriteClient.delete(id);
  invalidateRoleCache(role.slug);
  return NextResponse.json({ ok: true });
}
