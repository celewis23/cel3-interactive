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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const patch: Record<string, unknown> = {};
  const allowed = ["title", "description", "priority", "dueDate", "assignee", "clientRef", "columnId", "driveFileId", "driveFileUrl", "driveFileName"];
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }

  const updated = await sanityWriteClient.patch(id).set(patch).commit();
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  // Get the task to find its project
  const task = await sanityServer.fetch<{ projectId: string; columnId: string }>(
    `*[_type == "pmTask" && _id == $id][0]{ projectId, columnId }`,
    { id }
  );

  // Delete all comments on this task
  const comments = await sanityServer.fetch<{ _id: string }[]>(
    `*[_type == "pmComment" && taskId == $id]{ _id }`,
    { id }
  );
  for (const c of comments) await sanityWriteClient.delete(c._id);

  // Remove task from project columns
  if (task?.projectId) {
    const project = await sanityServer.fetch<{ columns: { id: string; taskIds: string[] }[] }>(
      `*[_type == "pmProject" && _id == $projectId][0]{ columns }`,
      { projectId: task.projectId }
    );
    if (project?.columns) {
      const updatedColumns = project.columns.map((col) => ({
        ...col,
        taskIds: (col.taskIds ?? []).filter((tid) => tid !== id),
      }));
      await sanityWriteClient.patch(task.projectId).set({ columns: updatedColumns }).commit();
    }
  }

  await sanityWriteClient.delete(id);
  return NextResponse.json({ ok: true });
}
