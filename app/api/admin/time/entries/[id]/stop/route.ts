import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export const runtime = "nodejs";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
