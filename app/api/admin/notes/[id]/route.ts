export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "notes", "edit");
  if (authErr) return authErr;

  try {
    const session = getSessionInfo(req);
    const { id } = await params;

    // Verify ownership
    const ownerFilter = session?.isOwner
      ? `staffId == null`
      : `staffId == "${session?.staffId}"`;
    const existing = await sanityServer.fetch(
      `*[_type == "adminNote" && _id == $id && ${ownerFilter}][0]{ _id }`,
      { id }
    );
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json() as {
      title?: string;
      content?: string;
      canvasData?: string;
      color?: string;
      isPinned?: boolean;
    };

    const patch: Record<string, unknown> = {};
    if (body.title !== undefined)      patch.title      = body.title?.trim() || "Untitled Note";
    if (body.content !== undefined)    patch.content    = body.content;
    if (body.canvasData !== undefined) patch.canvasData = body.canvasData;
    if (body.color !== undefined)      patch.color      = body.color;
    if (body.isPinned !== undefined)   patch.isPinned   = body.isPinned;

    await sanityWriteClient.patch(id).set(patch).commit();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("NOTES_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "notes", "delete");
  if (authErr) return authErr;

  try {
    const session = getSessionInfo(req);
    const { id } = await params;

    // Verify ownership before delete
    const ownerFilter = session?.isOwner
      ? `staffId == null`
      : `staffId == "${session?.staffId}"`;
    const existing = await sanityServer.fetch(
      `*[_type == "adminNote" && _id == $id && ${ownerFilter}][0]{ _id }`,
      { id }
    );
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await sanityWriteClient.delete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("NOTES_DELETE_ERR:", err);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
