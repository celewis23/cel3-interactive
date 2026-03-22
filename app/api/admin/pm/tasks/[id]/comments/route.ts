import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityWriteClient } from "@/lib/sanity.write";
import { sanityServer } from "@/lib/sanityServer";

export const runtime = "nodejs";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const comments = await sanityServer.fetch(
    `*[_type == "pmComment" && taskId == $id] | order(_createdAt asc)`,
    { id }
  );
  return NextResponse.json(comments);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
