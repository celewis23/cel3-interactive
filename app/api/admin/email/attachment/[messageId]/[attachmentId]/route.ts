export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { getVerifiedAttachment } from "@/lib/gmail/api";
import { attachmentHeaders } from "@/lib/gmail/attachment-preview";
import { renderImagePreview } from "@/lib/gmail/image-preview";

type Params = { params: Promise<{ messageId: string; attachmentId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "email", "view");
  if (authErr) return authErr;

  try {
    const { messageId, attachmentId } = await params;
    const inline = req.nextUrl.searchParams.get("inline") === "1";
    const { data, attachment } = await getVerifiedAttachment(messageId, attachmentId);
    const file = inline ? await renderImagePreview(data, attachment.mimeType) : { data, mimeType: attachment.mimeType, converted: false };
    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        ...attachmentHeaders(file.converted ? `${attachment.filename}.preview.webp` : attachment.filename, file.mimeType, inline, file.data.length),
        ...(file.converted ? { "X-Attachment-Preview-Converted": "1" } : {}),
      },
    });
  } catch (err) {
    console.error("ATTACHMENT_FETCH_ERROR:", err);
    return NextResponse.json({ error: "Failed to fetch attachment" }, { status: 500 });
  }
}
