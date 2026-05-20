export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getMessagingActor } from "@/lib/messaging/auth";
import { listConversations, startAdminConversation, startConversation } from "@/lib/messaging/service";

export async function GET(req: NextRequest) {
  const actor = await getMessagingActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const conversations = await listConversations(actor, searchParams.get("q") ?? undefined);
  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  const actor = await getMessagingActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (actor.kind === "admin") {
    const result = await startAdminConversation(actor, body, req);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ conversation: result.conversation, message: result.message }, { status: result.status });
  }

  const result = await startConversation(actor, body, req);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result, { status: 201 });
}
