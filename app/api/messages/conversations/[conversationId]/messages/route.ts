export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getMessagingActor } from "@/lib/messaging/auth";
import { MessageAttachmentInput, sendConversationMessage } from "@/lib/messaging/service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const actor = await getMessagingActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await params;
  const contentType = req.headers.get("content-type") ?? "";
  let bodyInput: unknown = "";
  let attachments: MessageAttachmentInput[] = [];

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    bodyInput = formData.get("body") ?? "";
    const files = formData.getAll("files").filter((item): item is File => item instanceof File);
    attachments = await Promise.all(files.map(async (file) => ({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      data: Buffer.from(await file.arrayBuffer()),
    })));
  } else {
    const body = await req.json().catch(() => ({}));
    bodyInput = body.body;
  }

  const result = await sendConversationMessage(actor, conversationId, bodyInput, req, attachments);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ message: result.message }, { status: result.status });
}
