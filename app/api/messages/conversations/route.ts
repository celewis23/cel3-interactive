export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getMessagingActor } from "@/lib/messaging/auth";
import { listConversations, MessageAttachmentInput, startAdminConversation, startConversation } from "@/lib/messaging/service";

async function parseConversationRequest(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  let body: { title?: unknown; body?: unknown; portalUserId?: unknown } = {};
  let attachments: MessageAttachmentInput[] = [];

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    body = {
      title: formData.get("title") ?? "",
      body: formData.get("body") ?? "",
      portalUserId: formData.get("portalUserId") ?? undefined,
    };
    const files = formData.getAll("files").filter((item): item is File => item instanceof File);
    attachments = await Promise.all(files.map(async (file) => ({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      data: Buffer.from(await file.arrayBuffer()),
    })));
  } else {
    body = await req.json().catch(() => ({}));
  }

  return { body, attachments };
}

export async function GET(req: NextRequest) {
  try {
    const actor = await getMessagingActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const conversations = await listConversations(actor, searchParams.get("q") ?? undefined);
    return NextResponse.json({ conversations });
  } catch (err) {
    console.error("MESSAGES_CONVERSATIONS_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to load conversations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getMessagingActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { body, attachments } = await parseConversationRequest(req);
    if (actor.kind === "admin") {
      const result = await startAdminConversation(actor, body, req, attachments);
      if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json({ conversation: result.conversation, message: result.message }, { status: result.status });
    }

    const result = await startConversation(actor, body, req, attachments);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("MESSAGES_CONVERSATIONS_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to start conversation" }, { status: 500 });
  }
}
