export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { uploadFile, createFolder, listFiles } from "@/lib/google/drive";

type Params = { params: Promise<{ id: string }> };

async function getOrCreateFolder(name: string, parentId?: string): Promise<string> {
  const q = parentId
    ? `name = '${name}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    : `name = '${name}' and 'root' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  // Quick check via listFiles won't support q param — use createFolder pattern instead
  // We just try to create; if already exists Drive returns the existing one isn't guaranteed,
  // so we search first via a dedicated approach: attempt list with folderId=root and find by name.
  try {
    const { files } = await listFiles({ folderId: parentId ?? "root" });
    const existing = files.find((f) => f.isFolder && f.name === name);
    if (existing) return existing.id;
  } catch { /* ignore */ }

  const folder = await createFolder(name, parentId);
  return folder.id;
}

export async function POST(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "expenses", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const session = getSessionInfo(req);

    const existing = await sanityServer.fetch<{ staffId?: string } | null>(
      `*[_type == "expense" && _id == $id][0]{ staffId, date }`,
      { id }
    );
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (session && !session.isOwner && session.staffId && (existing as { staffId?: string }).staffId !== session.staffId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const expense = existing as { staffId?: string; date?: string };
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buf   = Buffer.from(bytes);

    // Build Drive path: Expenses/YYYY/MM/
    const date  = expense.date ?? new Date().toISOString().slice(0, 10);
    const yyyy  = date.slice(0, 4);
    const mm    = date.slice(5, 7);

    let driveFileId: string | null = null;
    let driveFileUrl: string | null = null;

    try {
      const expFolderId  = await getOrCreateFolder("Expenses");
      const yearFolderId = await getOrCreateFolder(yyyy, expFolderId);
      const monFolderId  = await getOrCreateFolder(mm, yearFolderId);

      const uploaded = await uploadFile({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        data: buf,
        parentId: monFolderId,
      });

      driveFileId  = uploaded.id;
      driveFileUrl = uploaded.webViewLink ?? `https://drive.google.com/file/d/${uploaded.id}/view`;
    } catch (driveErr) {
      console.warn("RECEIPT_DRIVE_ERR (non-fatal):", driveErr);
      // Drive not connected — fall through with no URL
    }

    const receipt = {
      _key: `r${Date.now()}`,
      name: file.name,
      uploadedAt: new Date().toISOString(),
      driveFileId: driveFileId ?? null,
      url: driveFileUrl ?? null,
    };

    await sanityWriteClient.patch(id).append("receipts", [receipt]).commit();

    return NextResponse.json(receipt, { status: 201 });
  } catch (err) {
    console.error("EXPENSE_RECEIPT_ERR:", err);
    return NextResponse.json({ error: "Failed to upload receipt" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "expenses", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const { key } = await req.json() as { key: string };

    await sanityWriteClient.patch(id).unset([`receipts[_key == "${key}"]`]).commit();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("EXPENSE_RECEIPT_DELETE_ERR:", err);
    return NextResponse.json({ error: "Failed to remove receipt" }, { status: 500 });
  }
}
