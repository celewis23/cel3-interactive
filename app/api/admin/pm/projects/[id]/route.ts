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

  const project = await sanityServer.fetch(
    `*[_type == "pmProject" && _id == $id][0]`,
    { id }
  );
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(project);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const patch: Record<string, unknown> = {};
  const allowed = ["name", "description", "status", "dueDate", "clientRef", "columns"];
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  const updated = await sanityWriteClient.patch(id).set(patch).commit();
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  // Delete all tasks and comments belonging to this project
  const tasks = await sanityServer.fetch<{ _id: string }[]>(
    `*[_type == "pmTask" && projectId == $id]{ _id }`,
    { id }
  );
  for (const task of tasks) {
    const comments = await sanityServer.fetch<{ _id: string }[]>(
      `*[_type == "pmComment" && taskId == $task]{ _id }`,
      { task: task._id }
    );
    for (const c of comments) await sanityWriteClient.delete(c._id);
    await sanityWriteClient.delete(task._id);
  }

  await sanityWriteClient.delete(id);
  return NextResponse.json({ ok: true });
}
