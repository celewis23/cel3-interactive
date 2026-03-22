export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "announcements", "view");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const session = getSessionInfo(req);
    const userId = session?.staffId ?? null;
    if (!userId) return NextResponse.json({ ok: true }); // owner — no tracking needed

    const doc = await sanityServer.fetch<{ readBy: string[] | null } | null>(
      `*[_type == "announcement" && _id == $id][0]{ readBy }`,
      { id }
    );
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const readBy = doc.readBy ?? [];
    if (!readBy.includes(userId)) {
      await sanityWriteClient.patch(id).append("readBy", [userId]).commit();
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("ANNOUNCEMENT_READ_ERR:", err);
    return NextResponse.json({ error: "Failed to mark read" }, { status: 500 });
  }
}
