import { withActivity } from "@/lib/audit/withActivity";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getMessagingActor } from "@/lib/messaging/auth";
import { markConversationRead } from "@/lib/messaging/service";

async function handleActivityPOST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const actor = await getMessagingActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { conversationId } = await params;
    const result = await markConversationRead(actor, conversationId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("MESSAGES_READ_ERR:", err);
    return NextResponse.json({ error: "Failed to mark conversation read" }, { status: 500 });
  }
}

export const POST = withActivity("/api/messages/conversations/[conversationId]/read", "POST", handleActivityPOST);
