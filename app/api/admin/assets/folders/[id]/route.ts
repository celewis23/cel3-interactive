export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "assets", "edit");
  if (authErr) return authErr;

  const { id } = await params;

  try {
    const body = await req.json() as { name?: string; parentId?: string | null };
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name.trim();
    if ("parentId" in body) patch.parentId = body.parentId ?? null;

    const updated = await sanityWriteClient.patch(id).set(patch).commit();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("ASSET_FOLDER_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update folder" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "assets", "delete");
  if (authErr) return authErr;

  const { id } = await params;

  try {
    // Move child assets to no folder, move child folders to parent
    const folder = await sanityServer.fetch<{ parentId?: string } | null>(
      `*[_type == "assetFolder" && _id == $id][0]{ parentId }`,
      { id }
    );

    // Re-parent child folders to grandparent
    const childFolders = await sanityServer.fetch<{ _id: string }[]>(
      `*[_type == "assetFolder" && parentId == $id]{ _id }`,
      { id }
    );
    for (const f of childFolders) {
      await sanityWriteClient.patch(f._id).set({ parentId: folder?.parentId ?? null }).commit();
    }

    // Unlink assets in this folder
    await sanityWriteClient
      .patch({ query: `*[_type == "assetItem" && folderId == $id]`, params: { id } })
      .set({ folderId: null })
      .commit();

    await sanityWriteClient.delete(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("ASSET_FOLDER_DELETE_ERR:", err);
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
  }
}
