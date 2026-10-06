export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { getVerifiedAttachment } from "@/lib/gmail/api";
import { attachmentHeaders } from "@/lib/gmail/attachment-preview";

type Params = { params: Promise<{ messageId: string; attachmentId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "email", "view");
  if (authErr) return authErr;

  try {
    const { messageId, attachmentId } = await params;
    const inline = req.nextUrl.searchParams.get("inline") === "1";
    const { data, attachment } = await getVerifiedAttachment(messageId, attachmentId);
    return new NextResponse(new Uint8Array(data), {
      headers: attachmentHeaders(attachment.filename, attachment.mimeType, inline, data.length),
    });
  } catch (err) {
    console.error("ATTACHMENT_FETCH_ERROR:", err);
    return NextResponse.json({ error: "Failed to fetch attachment" }, { status: 500 });
  }
}
