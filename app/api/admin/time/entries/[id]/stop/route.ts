import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "timeTracking", "edit");
  if (authErr) return authErr;
  const { id } = await params;
  try {
    const entry = await sanityServer.fetch<{
      _id: string;
      startTime: string;
      endTime: string | null;
    } | null>(`*[_type == "timeEntry" && _id == $id][0]{ _id, startTime, endTime }`, { id });

    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (entry.endTime) return NextResponse.json({ error: "Timer already stopped" }, { status: 409 });

    const now = new Date().toISOString();
    const durationSeconds = Math.max(
      0,
      Math.round((new Date(now).getTime() - new Date(entry.startTime).getTime()) / 1000)
    );

    const updated = await sanityWriteClient
      .patch(id)
      .set({ endTime: now, durationSeconds })
      .commit();

    return NextResponse.json(updated);
  } catch (err) {
    console.error("TIME_ENTRY_STOP_ERR:", err);
    return NextResponse.json({ error: "Failed to stop timer" }, { status: 500 });
  }
}
