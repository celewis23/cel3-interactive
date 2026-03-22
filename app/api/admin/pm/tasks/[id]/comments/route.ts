import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityWriteClient } from "@/lib/sanity.write";
import { sanityServer } from "@/lib/sanityServer";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "projects", "view");
  if (authErr) return authErr;
  const { id } = await params;

  const comments = await sanityServer.fetch(
    `*[_type == "pmComment" && taskId == $id] | order(_createdAt asc)`,
    { id }
  );
  return NextResponse.json(comments);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "projects", "edit");
  if (authErr) return authErr;
  const { id } = await params;
  const body = await req.json();

  if (!body.text?.trim()) return NextResponse.json({ error: "Text is required" }, { status: 400 });

  const comment = await sanityWriteClient.create({
    _type: "pmComment",
    taskId: id,
    text: body.text.trim(),
    author: body.author?.trim() ?? "Admin",
  });

  return NextResponse.json(comment, { status: 201 });
}
