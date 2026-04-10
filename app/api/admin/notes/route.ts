export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "notes", "view");
  if (authErr) return authErr;

  try {
    const session = getSessionInfo(req);
    // Notes are personal — scope to the owner or a specific staff member
    const ownerFilter = session?.isOwner
      ? `staffId == null`
      : `staffId == "${session?.staffId}"`;

    const notes = await sanityServer.fetch(
      `*[_type == "adminNote" && ${ownerFilter}] | order(isPinned desc, _updatedAt desc) {
        _id, title, content, canvasData, color, isPinned, _createdAt, _updatedAt
      }`
    );

    return NextResponse.json(notes);
  } catch (err) {
    console.error("NOTES_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "notes", "edit");
  if (authErr) return authErr;

  try {
    const session = getSessionInfo(req);
    const body = await req.json() as {
      title?: string;
      content?: string;
      canvasData?: string;
      color?: string;
      isPinned?: boolean;
    };

    const note = await sanityWriteClient.create({
      _type: "adminNote",
      title: body.title?.trim() || "Untitled Note",
      content: body.content ?? null,
      canvasData: body.canvasData ?? null,
      color: body.color ?? null,
      isPinned: body.isPinned ?? false,
      staffId: session?.isOwner ? null : (session?.staffId ?? null),
    });

    return NextResponse.json({ _id: note._id });
  } catch (err) {
    console.error("NOTES_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
