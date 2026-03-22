export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { listSpaces, createSpace, deleteSpace } from "@/lib/google/chat";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "chat", "view");
  if (authErr) return authErr;

  try {
    const spaces = await listSpaces();
    return NextResponse.json(spaces);
  } catch (err) {
    console.error("CHAT_SPACES_ERROR:", err);
    const msg = err instanceof Error ? err.message : "Failed to list spaces";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authErr = await requirePermission(req, "chat", "edit");
  if (authErr) return authErr;

  try {
    const { searchParams } = new URL(req.url);
    const spaceName = searchParams.get("name");
    if (!spaceName) return NextResponse.json({ error: "name is required" }, { status: 400 });
    await deleteSpace(spaceName);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("CHAT_DELETE_SPACE_ERROR:", err);
    const msg = err instanceof Error ? err.message : "Failed to delete space";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "chat", "edit");
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { displayName, spaceType, description } = body;
    if (!displayName || !spaceType) {
      return NextResponse.json({ error: "displayName and spaceType are required" }, { status: 400 });
    }
    const space = await createSpace({ displayName, spaceType, description });
    return NextResponse.json(space, { status: 201 });
  } catch (err) {
    console.error("CHAT_CREATE_SPACE_ERROR:", err);
    const msg = err instanceof Error ? err.message : "Failed to create space";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
