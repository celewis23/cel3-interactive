export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getMessagingActor } from "@/lib/messaging/auth";
import { getConversation } from "@/lib/messaging/service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const actor = await getMessagingActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await params;
  const result = await getConversation(actor, conversationId);
  if (!result) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  return NextResponse.json(result);
}

