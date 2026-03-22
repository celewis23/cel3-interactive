import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "staffManagement", "view");
  if (authErr) return authErr;

  const { id } = await params;
  const member = await sanityServer.fetch(
    `*[_type == "staffMember" && _id == $id][0]{
      _id, name, email, roleSlug, status,
      inviteToken, inviteExpiry, inviteAcceptedAt,
      joinedAt, lastActiveAt
    }`,
    { id }
  );
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(member);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "staffManagement", "edit");
  if (authErr) return authErr;

  const { id } = await params;
  const body = await req.json();

  const member = await sanityServer.fetch<{ status: string; roleSlug: string } | null>(
    `*[_type == "staffMember" && _id == $id][0]{ status, roleSlug }`,
    { id }
  );
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = getSessionInfo(req);
  const isOwner = session?.isOwner ?? false;

  // Prevent non-owners from changing roles of owner-role members
  if (!isOwner && member.roleSlug === "owner") {
    return NextResponse.json({ error: "Only an Owner can modify another Owner's record" }, { status: 403 });
  }

  // Prevent demoting the last owner
  if (body.roleSlug && member.roleSlug === "owner" && body.roleSlug !== "owner") {
    const ownerCount = await sanityServer.fetch<number>(
      `count(*[_type == "staffMember" && roleSlug == "owner" && status == "active"])`,
      {}
    );
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "Cannot change role — this is the last active Owner" },
        { status: 409 }
      );
    }
  }

  const allowed: Record<string, unknown> = {};
  if (body.name !== undefined)     allowed.name = String(body.name).trim();
  if (body.roleSlug !== undefined) allowed.roleSlug = body.roleSlug;
  if (body.status !== undefined && ["active", "inactive"].includes(body.status)) {
    allowed.status = body.status;
  }

  const updated = await sanityWriteClient.patch(id).set(allowed).commit();
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "staffManagement", "manage");
  if (authErr) return authErr;

  const { id } = await params;
  const member = await sanityServer.fetch<{ roleSlug: string; status: string } | null>(
    `*[_type == "staffMember" && _id == $id][0]{ roleSlug, status }`,
    { id }
  );
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Prevent deleting the last owner
  if (member.roleSlug === "owner") {
    const ownerCount = await sanityServer.fetch<number>(
      `count(*[_type == "staffMember" && roleSlug == "owner" && status == "active"])`,
      {}
    );
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "Cannot delete — this is the last active Owner" },
        { status: 409 }
      );
    }
  }

  await sanityWriteClient.delete(id);
  return NextResponse.json({ ok: true });
}
