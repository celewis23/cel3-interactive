export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityWriteClient } from "@/lib/sanity.write";

export async function PATCH(req: NextRequest) {
  const authErr = await requirePermission(req, "announcements", "view");
  if (authErr) return authErr;

  try {
    const { order } = await req.json() as { order: Array<{ id: string; order: number }> };
    if (!Array.isArray(order)) {
      return NextResponse.json({ error: "order must be an array" }, { status: 400 });
    }

    // Batch patch all pins with new order values
    const transaction = sanityWriteClient.transaction();
    for (const { id, order: newOrder } of order) {
      transaction.patch(id, (p) => p.set({ order: newOrder }));
    }
    await transaction.commit();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PINS_REORDER_ERR:", err);
    return NextResponse.json({ error: "Failed to reorder pins" }, { status: 500 });
  }
}
