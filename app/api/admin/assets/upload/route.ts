export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { logAudit, AuditAction } from "@/lib/audit/log";

const ALLOWED_TYPES = new Set([
  // Images
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/avif",
  // Video
  "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Fonts
  "font/ttf", "font/otf", "font/woff", "font/woff2",
  // Archives
  "application/zip", "application/x-zip-compressed",
  // Text/code
  "text/plain", "text/csv",
]);

function guessFileType(mime: string): string {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("font/")) return "font";
  if (mime.includes("zip")) return "zip";
  if (mime.includes("word") || mime.includes("document")) return "doc";
  if (mime.includes("sheet") || mime.includes("excel") || mime === "text/csv") return "spreadsheet";
  if (mime.includes("presentation") || mime.includes("powerpoint")) return "presentation";
  return "other";
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "assets", "edit");
  if (authErr) return authErr;

  try {
    const session = getSessionInfo(req);
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const folderId = (formData.get("folderId") as string | null) || null;
    const tagsRaw  = (formData.get("tags") as string | null) || "";
    const tags     = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const mime = file.type || "application/octet-stream";
    if (!ALLOWED_TYPES.has(mime)) {
      return NextResponse.json({ error: `File type not allowed: ${mime}` }, { status: 400 });
    }

    const MAX_BYTES = 200 * 1024 * 1024; // 200 MB
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 200 MB)" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Sanity file assets (built-in CDN storage)
    const uploaded = await sanityWriteClient.assets.upload("file", buffer, {
      filename: file.name,
      contentType: mime,
    });

    const fileUrl = uploaded.url;

    // Create asset document
    const asset = await sanityWriteClient.create({
      _type: "assetItem",
      name: file.name,
      fileUrl,
      fileType: guessFileType(mime),
      mimeType: mime,
      sizeBytes: file.size,
      folderId: folderId ?? null,
      tags,
      linkedEntityType: null,
      linkedEntityId: null,
      uploadedBy: session?.staffId ?? null,
      isPublic: false,
      publicToken: null,
      publicExpiresAt: null,
      sourceRef: null,
      sanityAssetId: uploaded._id,
      createdAt: new Date().toISOString(),
    });

    logAudit(req, {
      action: AuditAction.FILE_UPLOADED,
      resourceType: "asset",
      resourceId: asset._id,
      resourceLabel: file.name,
      description: `Asset uploaded: ${file.name}`,
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (err) {
    console.error("ASSET_UPLOAD_ERR:", err);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
