import { withActivity } from "@/lib/audit/withActivity";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { deleteMessage, updateMessage } from "@/lib/google/chat";

async function handleActivityDELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "chat", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const messageName = decodeURIComponent(id);
    await deleteMessage(messageName);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("CHAT_DELETE_MESSAGE_ERROR:", err);
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
}

async function handleActivityPUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "chat", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const messageName = decodeURIComponent(id);
    const body = await req.json();
    const { text } = body;
    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    const message = await updateMessage(messageName, text);
    return NextResponse.json(message);
  } catch (err) {
    console.error("CHAT_UPDATE_MESSAGE_ERROR:", err);
    return NextResponse.json({ error: "Failed to update message" }, { status: 500 });
  }
}

export const DELETE = withActivity("/api/admin/chat/messages/[id]", "DELETE", handleActivityDELETE);

export const PUT = withActivity("/api/admin/chat/messages/[id]", "PUT", handleActivityPUT);
