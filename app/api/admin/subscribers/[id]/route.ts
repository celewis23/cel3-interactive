import { withActivity } from "@/lib/audit/withActivity";
import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { updateSubscriberStatus, deleteSubscriber } from "@/lib/campaigns/db";

export const runtime = "nodejs";

async function handleActivityPATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "settings", "edit");
  if (authErr) return authErr;
  const { id } = await params;
  const { status } = await req.json();
  if (status !== "active" && status !== "unsubscribed") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  await updateSubscriberStatus(id, status);
  return NextResponse.json({ ok: true });
}

async function handleActivityDELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "settings", "edit");
  if (authErr) return authErr;
  const { id } = await params;
  await deleteSubscriber(id);
  return NextResponse.json({ ok: true });
}

export const PATCH = withActivity("/api/admin/subscribers/[id]", "PATCH", handleActivityPATCH);

export const DELETE = withActivity("/api/admin/subscribers/[id]", "DELETE", handleActivityDELETE);
