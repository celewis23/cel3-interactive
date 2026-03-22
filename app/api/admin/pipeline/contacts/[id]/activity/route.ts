import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "leads", "view");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const activities = await sanityServer.fetch(
      `*[_type == "pipelineActivity" && contactId == $id] | order(_createdAt asc) {
        _id, _type, _createdAt,
        contactId, type, text, fromStage, toStage, author
      }`,
      { id }
    );
    return NextResponse.json(activities);
  } catch (err) {
    console.error("PIPELINE_ACTIVITY_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "leads", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await req.json();

    if (!body.text?.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const activity = await sanityWriteClient.create({
      _type: "pipelineActivity",
      contactId: id,
      type: body.type || "note",
      text: body.text.trim(),
      fromStage: null,
      toStage: null,
      author: body.author || "Admin",
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (err) {
    console.error("PIPELINE_ACTIVITY_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to create activity" }, { status: 500 });
  }
}
