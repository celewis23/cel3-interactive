export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "announcements", "view");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const doc = await sanityServer.fetch(
      `*[_type == "announcement" && _id == $id][0]`,
      { id }
    );
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(doc);
  } catch (err) {
    console.error("ANNOUNCEMENT_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "announcements", "manage");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await req.json();

    const patch: Record<string, unknown> = {};
    if ("title" in body) patch.title = body.title;
    if ("body" in body) patch.body = body.body;
    if ("priority" in body) patch.priority = body.priority;
    if ("expiryDate" in body) patch.expiryDate = body.expiryDate;
    if ("archived" in body) patch.archived = body.archived;

    const updated = await sanityWriteClient.patch(id).set(patch).commit();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("ANNOUNCEMENT_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "announcements", "manage");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    // Archive rather than hard delete
    await sanityWriteClient.patch(id).set({ archived: true }).commit();
    return NextResponse.json({ archived: true });
  } catch (err) {
    console.error("ANNOUNCEMENT_DELETE_ERR:", err);
    return NextResponse.json({ error: "Failed to archive" }, { status: 500 });
  }
}
