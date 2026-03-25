export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "assets", "view");
  if (authErr) return authErr;

  try {
    const folders = await sanityServer.fetch(
      `*[_type == "assetFolder"] | order(name asc) {
        _id, name, parentId, createdAt, _createdAt
      }`
    );
    return NextResponse.json({ folders });
  } catch (err) {
    console.error("ASSET_FOLDERS_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "assets", "edit");
  if (authErr) return authErr;

  try {
    const session = getSessionInfo(req);
    const body = await req.json() as { name: string; parentId?: string };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    }

    const folder = await sanityWriteClient.create({
      _type: "assetFolder",
      name: body.name.trim(),
      parentId: body.parentId ?? null,
      createdAt: new Date().toISOString(),
      createdBy: session?.staffId ?? null,
    });

    return NextResponse.json(folder, { status: 201 });
  } catch (err) {
    console.error("ASSET_FOLDER_CREATE_ERR:", err);
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
  }
}
