export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "assets", "view");
  if (authErr) return authErr;

  try {
    const { searchParams } = new URL(req.url);
    const folderId  = searchParams.get("folderId");   // "null" = root, undefined = all
    const tag       = searchParams.get("tag");
    const q         = searchParams.get("q");
    const fileType  = searchParams.get("fileType");
    const limit     = parseInt(searchParams.get("limit") ?? "60", 10);
    const offset    = parseInt(searchParams.get("offset") ?? "0", 10);

    const filters: string[] = [`_type == "assetItem"`];

    if (folderId === "null") {
      filters.push(`folderId == null || !defined(folderId)`);
    } else if (folderId) {
      filters.push(`folderId == "${folderId}"`);
    }

    if (tag)      filters.push(`"${tag}" in tags`);
    if (fileType) filters.push(`fileType == "${fileType}"`);
    if (q)        filters.push(`name match "*${q}*"`);

    const where = filters.join(" && ");

    const [assets, total] = await Promise.all([
      sanityServer.fetch(
        `*[${where}] | order(_createdAt desc) [${offset}...${offset + limit}] {
          _id, name, fileUrl, fileType, mimeType, sizeBytes, tags,
          folderId, linkedEntityType, linkedEntityId,
          uploadedBy, isPublic, publicToken, publicExpiresAt,
          sourceRef, _createdAt, createdAt
        }`
      ),
      sanityServer.fetch<number>(`count(*[${where}])`),
    ]);

    return NextResponse.json({ assets, total, limit, offset });
  } catch (err) {
    console.error("ASSETS_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "assets", "edit");
  if (authErr) return authErr;

  try {
    const session = getSessionInfo(req);
    const body = await req.json() as {
      name: string;
      fileUrl: string;
      fileType: string;
      mimeType: string;
      sizeBytes: number;
      folderId?: string;
      tags?: string[];
      linkedEntityType?: string;
      linkedEntityId?: string;
      sourceRef?: string;
    };

    if (!body.name || !body.fileUrl) {
      return NextResponse.json({ error: "name and fileUrl required" }, { status: 400 });
    }

    const asset = await sanityWriteClient.create({
      _type: "assetItem",
      name: body.name,
      fileUrl: body.fileUrl,
      fileType: body.fileType ?? "other",
      mimeType: body.mimeType ?? "application/octet-stream",
      sizeBytes: body.sizeBytes ?? 0,
      folderId: body.folderId ?? null,
      tags: body.tags ?? [],
      linkedEntityType: body.linkedEntityType ?? null,
      linkedEntityId: body.linkedEntityId ?? null,
      uploadedBy: session?.staffId ?? null,
      isPublic: false,
      publicToken: null,
      publicExpiresAt: null,
      sourceRef: body.sourceRef ?? null,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (err) {
    console.error("ASSET_CREATE_ERR:", err);
    return NextResponse.json({ error: "Failed to create asset" }, { status: 500 });
  }
}
