export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { getAttachment } from "@/lib/gmail/api";

type Params = { params: Promise<{ messageId: string; attachmentId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "email", "view");
  if (authErr) return authErr;

  try {
    const { messageId, attachmentId } = await params;
    const filename = req.nextUrl.searchParams.get("filename") ?? "attachment";
    const mimeType = req.nextUrl.searchParams.get("mime") ?? "application/octet-stream";
    const inline = req.nextUrl.searchParams.get("inline") === "1";

    const { data } = await getAttachment(messageId, attachmentId);

    const safeName = filename.replace(/[^\w\s.\-()]/g, "").trim() || "attachment";
    const disposition = inline ? "inline" : `attachment; filename="${safeName}"`;

    return new NextResponse(data.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": disposition,
        "Content-Length": String(data.length),
        // Allow inline images to be loaded in the iframe/img src
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("ATTACHMENT_FETCH_ERROR:", err);
    return NextResponse.json({ error: "Failed to fetch attachment" }, { status: 500 });
  }
}
