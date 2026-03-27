export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getSessionInfo } from "@/lib/admin/permissions";
import { getWebPushPublicKey, removePushSubscription, upsertPushSubscription } from "@/lib/notifications/push";

type PushSubscriptionInput = {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

function requireFullSession(req: NextRequest) {
  const session = getSessionInfo(req);
  if (!session) {
    return null;
  }
  if (session.isOwner) {
    return { isOwner: true as const, staffId: null, roleSlug: "owner" as const };
  }
  if (!session.staffId || !session.roleSlug) {
    return null;
  }
  return { isOwner: false as const, staffId: session.staffId, roleSlug: session.roleSlug };
}

function isValidSubscription(body: PushSubscriptionInput): body is PushSubscriptionInput & {
  keys: { p256dh: string; auth: string };
} {
  return !!body?.endpoint && !!body.keys?.p256dh && !!body.keys?.auth;
}

export async function GET(req: NextRequest) {
  const session = requireFullSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const publicKey = await getWebPushPublicKey();
  return NextResponse.json({ publicKey });
}

export async function POST(req: NextRequest) {
  const session = requireFullSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as PushSubscriptionInput | null;
  if (!body || !isValidSubscription(body)) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await upsertPushSubscription(session, {
    endpoint: body.endpoint,
    expirationTime: null,
    keys: body.keys,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = requireFullSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { endpoint?: string } | null;
  if (!body?.endpoint) {
    return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
  }

  await removePushSubscription(body.endpoint);
  return NextResponse.json({ ok: true });
}
