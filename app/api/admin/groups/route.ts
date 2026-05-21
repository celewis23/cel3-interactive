import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { listGroups, createGroup } from "@/lib/campaigns/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "settings", "view");
  if (authErr) return authErr;
  const groups = await listGroups().catch(() => []);
  return NextResponse.json({ groups });
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "settings", "edit");
  if (authErr) return authErr;
  try {
    const { name, description } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    const group = await createGroup(name.trim(), description?.trim() ?? null);
    return NextResponse.json({ group }, { status: 201 });
  } catch (err) {
    console.error("ADMIN_GROUPS_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
