import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import {
  getGroupById, updateGroup, deleteGroup,
  listGroupMembers, addGroupMember, removeGroupMember,
} from "@/lib/campaigns/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "settings", "view");
  if (authErr) return authErr;
  const { id } = await params;
  const [group, members] = await Promise.all([getGroupById(id), listGroupMembers(id)]);
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ group, members });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "settings", "edit");
  if (authErr) return authErr;
  try {
    const { id } = await params;
    const body = await req.json();

    if (body.action === "add_member") {
      await addGroupMember(id, body.memberType, body.memberId);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "remove_member") {
      await removeGroupMember(id, body.memberType, body.memberId);
      return NextResponse.json({ ok: true });
    }

    await updateGroup(id, body.name, body.description ?? null);
    const group = await getGroupById(id);
    return NextResponse.json({ group });
  } catch (err) {
    console.error("ADMIN_GROUP_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "settings", "edit");
  if (authErr) return authErr;
  const { id } = await params;
  await deleteGroup(id);
  return NextResponse.json({ ok: true });
}
