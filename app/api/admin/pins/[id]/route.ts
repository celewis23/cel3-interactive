export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

type Params = { params: Promise<{ id: string }> };

async function canEditPin(req: NextRequest, pin: { authorId: string | null }): Promise<boolean> {
  const session = getSessionInfo(req);
  if (!session) return false;
  if (session.isOwner) return true;
  // Author can edit their own; otherwise need manage permission
  if (session.staffId && pin.authorId === session.staffId) return true;
  // Check manage permission
  const authErr = await requirePermission(req, "announcements", "manage");
  return authErr === null;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "announcements", "view");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const pin = await sanityServer.fetch<{ authorId: string | null } | null>(
      `*[_type == "pin" && _id == $id][0]{ authorId }`,
      { id }
    );
    if (!pin) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!await canEditPin(req, pin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const patch: Record<string, unknown> = {};
    if ("title" in body) patch.title = body.title;
    if ("content" in body) patch.content = body.content;
    if ("url" in body) patch.url = body.url;
    if ("category" in body) patch.category = body.category;

    const updated = await sanityWriteClient.patch(id).set(patch).commit();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PIN_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update pin" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "announcements", "view");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const pin = await sanityServer.fetch<{ authorId: string | null } | null>(
      `*[_type == "pin" && _id == $id][0]{ authorId }`,
      { id }
    );
    if (!pin) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!await canEditPin(req, pin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await sanityWriteClient.delete(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("PIN_DELETE_ERR:", err);
    return NextResponse.json({ error: "Failed to delete pin" }, { status: 500 });
  }
}
