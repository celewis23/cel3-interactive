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

const ALLOWED = [
  "date", "startTime", "endTime", "durationSeconds", "description",
  "projectId", "projectName", "taskId", "taskTitle",
  "clientName", "pipelineContactId", "stripeCustomerId",
  "billable", "hourlyRate",
];

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const entry = await sanityServer.fetch(`*[_type == "timeEntry" && _id == $id][0]`, { id });
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(entry);
  } catch (err) {
    console.error("TIME_ENTRY_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch time entry" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();

    const current = await sanityServer.fetch<{
      startTime: string;
      endTime: string | null;
      durationSeconds: number;
    } | null>(`*[_type == "timeEntry" && _id == $id][0]{ startTime, endTime, durationSeconds }`, { id });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const patch: Record<string, unknown> = {};
    for (const field of ALLOWED) {
      if (field in body) patch[field] = body[field];
    }

    // Recompute duration if times changed
    const newStart = ("startTime" in patch ? patch.startTime : current.startTime) as string;
    const newEnd = ("endTime" in patch ? patch.endTime : current.endTime) as string | null;
    if (newStart && newEnd && !("durationSeconds" in body)) {
      patch.durationSeconds = Math.max(
        0,
        Math.round((new Date(newEnd).getTime() - new Date(newStart).getTime()) / 1000)
      );
    }

    const updated = await sanityWriteClient.patch(id).set(patch).commit();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("TIME_ENTRY_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update time entry" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    await sanityWriteClient.delete(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("TIME_ENTRY_DELETE_ERR:", err);
    return NextResponse.json({ error: "Failed to delete time entry" }, { status: 500 });
  }
}
