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

    const doc = await sanityServer.fetch<{
      _id: string;
      reactions: Array<{ _key: string; userId: string | null; userName: string }> | null;
    } | null>(
      `*[_type == "announcement" && _id == $id][0]{ _id, reactions }`,
      { id }
    );
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const reactions = doc.reactions ?? [];
    const existingIdx = reactions.findIndex((r) => r.userId === userId);

    if (existingIdx >= 0) {
      // Toggle off — remove reaction
      const key = reactions[existingIdx]._key;
      await sanityWriteClient.patch(id).unset([`reactions[_key == "${key}"]`]).commit();
      return NextResponse.json({ reacted: false });
    } else {
      // Toggle on — add reaction
      let userName = "Owner";
      if (userId) {
        const staff = await sanityServer.fetch<{ name: string } | null>(
          `*[_type == "staffMember" && _id == $staffId][0]{ name }`,
          { staffId: userId }
        );
        userName = staff?.name ?? "Staff";
      }
      await sanityWriteClient.patch(id).append("reactions", [{
        _key: crypto.randomUUID(),
        userId,
        userName,
        reactedAt: new Date().toISOString(),
      }]).commit();
      return NextResponse.json({ reacted: true });
    }
  } catch (err) {
    console.error("ANNOUNCEMENT_REACT_ERR:", err);
    return NextResponse.json({ error: "Failed to react" }, { status: 500 });
  }
}
