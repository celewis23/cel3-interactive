export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

type TargetType = "page" | "workspace" | "section";

function getScope(req: NextRequest) {
  const session = getSessionInfo(req);
  const isOwner = Boolean(session?.isOwner);
  const staffId = session?.staffId ?? null;
  return {
    ownerFilter: isOwner ? "staffId == null" : "staffId == $staffId",
    params: staffId ? { staffId } : {},
  };
}

function docTypeForTarget(target: TargetType) {
  if (target === "workspace") return "noteWorkspace";
  if (target === "section") return "noteSection";
  return "adminNote";
}

async function verifyOwned(id: string, target: TargetType, req: NextRequest) {
  const scope = getScope(req);
  return sanityServer.fetch<{ _id: string } | null>(
    `*[_type == $type && _id == $id && ${scope.ownerFilter}][0]{ _id }`,
    { ...scope.params, id, type: docTypeForTarget(target) }
  );
}

function targetFromRequest(req: NextRequest, body?: { targetType?: TargetType | string }): TargetType {
  const fromUrl = new URL(req.url).searchParams.get("target");
  const raw = body?.targetType ?? fromUrl;
  return raw === "workspace" || raw === "section" ? raw : "page";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "notes", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await req.json() as {
      targetType?: TargetType;
      title?: string;
      content?: string;
      canvasData?: string;
      blocksJson?: string;
      color?: string | null;
      isPinned?: boolean;
      isFavorite?: boolean;
      isArchived?: boolean;
      workspaceId?: string;
      sectionId?: string;
      parentPageId?: string | null;
      order?: number;
      tags?: string[];
      metadataJson?: string | null;
      linkedRecords?: Array<{ type: string; id: string; label?: string }>;
    };
    const targetType = targetFromRequest(req, body);

    const existing = await verifyOwned(id, targetType, req);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const patch: Record<string, unknown> = {};
    if (body.title !== undefined) patch.title = body.title?.trim() || (targetType === "page" ? "Untitled Note" : "Untitled");
    if (body.order !== undefined) patch.order = body.order;
    if (body.color !== undefined) patch.color = body.color;
    if (body.isFavorite !== undefined) patch.isFavorite = body.isFavorite;
    if (body.isArchived !== undefined) patch.isArchived = body.isArchived;

    if (targetType === "section") {
      if (body.workspaceId !== undefined) patch.workspaceId = body.workspaceId;
    }

    if (targetType === "page") {
      if (body.content !== undefined) patch.content = body.content;
      if (body.canvasData !== undefined) patch.canvasData = body.canvasData;
      if (body.blocksJson !== undefined) patch.blocksJson = body.blocksJson;
      if (body.isPinned !== undefined) patch.isPinned = body.isPinned;
      if (body.workspaceId !== undefined) patch.workspaceId = body.workspaceId;
      if (body.sectionId !== undefined) patch.sectionId = body.sectionId;
      if (body.parentPageId !== undefined) patch.parentPageId = body.parentPageId;
      if (body.tags !== undefined) patch.tags = body.tags;
      if (body.metadataJson !== undefined) patch.metadataJson = body.metadataJson;
      if (body.linkedRecords !== undefined) patch.linkedRecords = body.linkedRecords;
    }

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
    const { id } = await params;
    const targetType = targetFromRequest(req);
    const existing = await verifyOwned(id, targetType, req);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const permanent = new URL(req.url).searchParams.get("permanent") === "true";
    if (permanent) {
      await sanityWriteClient.delete(id);
    } else {
      await sanityWriteClient.patch(id).set({ isArchived: true }).commit();
    }
    return NextResponse.json({ success: true, archived: !permanent });
  } catch (err) {
    console.error("NOTES_DELETE_ERR:", err);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
