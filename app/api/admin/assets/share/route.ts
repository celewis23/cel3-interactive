export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { sanityServer } from "@/lib/sanityServer";

// Public endpoint — no auth required; used to resolve a public share token
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  try {
    // Sanitize token to avoid injection (only allow URL-safe base64 chars)
    const safeToken = token.replace(/[^A-Za-z0-9_-]/g, "");
    const asset = await sanityServer.fetch(
      `*[_type == "assetItem" && publicToken == "${safeToken}" && isPublic == true][0] {
        _id, name, fileUrl, fileType, mimeType, sizeBytes, publicExpiresAt
      }`
    ) as { _id: string; name: string; fileUrl: string; fileType: string;
            mimeType: string; sizeBytes: number; publicExpiresAt: string | null } | null;

    if (!asset) {
      return NextResponse.json({ error: "Not found or link is disabled" }, { status: 404 });
    }

    if (asset.publicExpiresAt && new Date(asset.publicExpiresAt) < new Date()) {
      return NextResponse.json({ error: "This link has expired" }, { status: 410 });
    }

    return NextResponse.json(asset);
  } catch (err) {
    console.error("ASSET_SHARE_ERR:", err);
    return NextResponse.json({ error: "Failed to resolve link" }, { status: 500 });
  }
}
