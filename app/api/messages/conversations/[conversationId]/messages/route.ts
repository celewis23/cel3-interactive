export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getMessagingActor } from "@/lib/messaging/auth";
import { sendConversationMessage } from "@/lib/messaging/service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const actor = await getMessagingActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await params;
  const body = await req.json().catch(() => ({}));
  const result = await sendConversationMessage(actor, conversationId, body.body, req);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ message: result.message }, { status: result.status });
}

