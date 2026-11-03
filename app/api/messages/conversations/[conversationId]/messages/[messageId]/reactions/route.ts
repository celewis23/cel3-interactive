import { withActivity } from "@/lib/audit/withActivity";
import { NextRequest, NextResponse } from "next/server";
import { getMessagingActor } from "@/lib/messaging/auth";
import { setMessageReaction } from "@/lib/messaging/service";
export const runtime = "nodejs";
async function handleActivityPUT(req: NextRequest, { params }: { params: Promise<{ conversationId: string; messageId: string }> }) {
  try {
    const actor = await getMessagingActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { conversationId, messageId } = await params;
    const body = await req.json().catch(() => ({}));
    const result = await setMessageReaction(actor, conversationId, messageId, body.emoji, body.active);
    return NextResponse.json(result, { status: result.status });
  } catch (err) {
    console.error("MESSAGE_REACTION_ERR", err);
    return NextResponse.json({ error: "Failed to update reaction" }, { status: 500 });
  }
}

export const PUT = withActivity("/api/messages/conversations/[conversationId]/messages/[messageId]/reactions", "PUT", handleActivityPUT);
