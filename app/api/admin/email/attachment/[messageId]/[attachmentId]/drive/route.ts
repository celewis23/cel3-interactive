import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { getVerifiedAttachment } from "@/lib/gmail/api";
import { uploadFile } from "@/lib/google/drive";
import { withActivity } from "@/lib/audit/withActivity";

export const runtime = "nodejs";
type Context = { params: Promise<{ messageId: string; attachmentId: string }> };

async function saveToDrive(req: NextRequest, { params }: Context) {
  const emailDenied = await requirePermission(req, "email", "view");
  if (emailDenied) return emailDenied;
  const driveDenied = await requirePermission(req, "drive", "edit");
  if (driveDenied) return driveDenied;
  try {
    const { messageId, attachmentId } = await params;
    const { attachment, data } = await getVerifiedAttachment(messageId, attachmentId);
    const file = await uploadFile({ name: attachment.filename, mimeType: attachment.mimeType, data });
    return NextResponse.json({ id: file.id, name: file.name, url: file.webViewLink || `https://drive.google.com/file/d/${encodeURIComponent(file.id)}/view` }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not save to Google Drive. Check your Drive connection and try again." }, { status: 500 });
  }
}

export const POST = withActivity("/api/admin/email/attachment/[messageId]/[attachmentId]/drive", "POST", saveToDrive);
