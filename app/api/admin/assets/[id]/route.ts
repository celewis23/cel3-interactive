export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import crypto from "crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "assets", "view");
  if (authErr) return authErr;

  const { id } = await params;

  try {
    const asset = await sanityServer.fetch(
      `*[_type == "assetItem" && _id == $id][0] {
        _id, name, fileUrl, fileType, mimeType, sizeBytes, tags,
        folderId, linkedEntityType, linkedEntityId,
        uploadedBy, isPublic, publicToken, publicExpiresAt,
        sourceRef, _createdAt, createdAt
      }`,
      { id }
    );
    if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(asset);
  } catch (err) {
    console.error("ASSET_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch asset" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "assets", "edit");
  if (authErr) return authErr;

  const { id } = await params;

  try {
    const body = await req.json() as {
      name?: string;
      folderId?: string | null;
      tags?: string[];
      linkedEntityType?: string | null;
      linkedEntityId?: string | null;
      isPublic?: boolean;
      publicExpiresAt?: string | null;
      generateToken?: boolean;
    };

    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name;
    if ("folderId" in body) patch.folderId = body.folderId ?? null;
    if (body.tags !== undefined) patch.tags = body.tags;
    if ("linkedEntityType" in body) patch.linkedEntityType = body.linkedEntityType ?? null;
    if ("linkedEntityId" in body) patch.linkedEntityId = body.linkedEntityId ?? null;
    if (body.isPublic !== undefined) patch.isPublic = body.isPublic;
    if ("publicExpiresAt" in body) patch.publicExpiresAt = body.publicExpiresAt ?? null;

    // Generate or revoke public token
    if (body.generateToken) {
      patch.publicToken = crypto.randomBytes(24).toString("base64url");
      patch.isPublic = true;
    } else if (body.isPublic === false) {
      patch.publicToken = null;
    }

    const updated = await sanityWriteClient.patch(id).set(patch).commit();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("ASSET_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update asset" }, { status: 500 });
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
    await sanityWriteClient.delete(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("ASSET_DELETE_ERR:", err);
    return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
  }
}
