import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { createEvent } from "@/lib/google/calendar";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "leads", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await req.json();
    const { summary, date, note } = body as {
      summary: string;
      date: string;
      note?: string;
    };

    if (!summary?.trim() || !date) {
      return NextResponse.json({ error: "summary and date are required" }, { status: 400 });
    }

    const contact = await sanityServer.fetch<{ _id: string; name: string } | null>(
      `*[_type == "pipelineContact" && _id == $id][0]{ _id, name }`,
      { id }
    );
    if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let event = null;
    let followUpEventId: string | null = null;

    try {
      event = await createEvent("primary", {
        summary: `${summary.trim()} — ${contact.name}`,
        description: note?.trim() || undefined,
        start: { date },
        end: { date },
      });
      followUpEventId = event.id || null;
    } catch (calErr) {
      console.error("PIPELINE_FOLLOW_UP_CALENDAR_ERR:", calErr);
      // Best-effort — continue even if calendar fails
    }

    // Patch contact with followUpEventId
    if (followUpEventId) {
      await sanityWriteClient.patch(id).set({ followUpEventId }).commit();
    }

    // Create "follow_up" activity
    await sanityWriteClient.create({
      _type: "pipelineActivity",
      contactId: id,
      type: "follow_up",
      text: `Follow-up scheduled: ${summary.trim()} on ${date}${note ? ` — ${note.trim()}` : ""}`,
      fromStage: null,
      toStage: null,
      author: "Admin",
    });

    return NextResponse.json({ event, followUpEventId });
  } catch (err) {
    console.error("PIPELINE_FOLLOW_UP_ERR:", err);
    return NextResponse.json({ error: "Failed to schedule follow-up" }, { status: 500 });
  }
}
