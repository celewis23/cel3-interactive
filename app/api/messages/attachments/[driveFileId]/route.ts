export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getMessagingActor } from "@/lib/messaging/auth";
import { getMessageAttachmentFile } from "@/lib/messaging/service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ driveFileId: string }> }
) {
  try {
    const actor = await getMessagingActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { driveFileId } = await params;
    const result = await getMessageAttachmentFile(actor, decodeURIComponent(driveFileId));
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const body = new Uint8Array(result.data).buffer;

    return new NextResponse(body, {
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `inline; filename="${result.name.replace(/"/g, "'")}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    console.error("MESSAGES_ATTACHMENT_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to load attachment" }, { status: 500 });
  }
}
