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

  const tasks = await sanityServer.fetch(
    `*[_type == "pmTask" && projectId == $id]`,
    { id }
  );
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  if (!body.title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!body.columnId) return NextResponse.json({ error: "columnId is required" }, { status: 400 });

  // Create the task
  const task = await sanityWriteClient.create({
    _type: "pmTask",
    projectId: id,
    columnId: body.columnId,
    title: body.title.trim(),
    description: body.description?.trim() ?? "",
    priority: body.priority ?? "medium",
    dueDate: body.dueDate ?? null,
    assignee: body.assignee?.trim() ?? null,
    clientRef: body.clientRef ?? null,
    driveFileId: null,
    driveFileUrl: null,
    driveFileName: null,
  });

  // Append task ID to the column's taskIds in the project
  const project = await sanityServer.fetch<{ columns: { id: string; taskIds: string[] }[] }>(
    `*[_type == "pmProject" && _id == $id][0]{ columns }`,
    { id }
  );
  if (project?.columns) {
    const updatedColumns = project.columns.map((col) =>
      col.id === body.columnId
        ? { ...col, taskIds: [...(col.taskIds ?? []), task._id] }
        : col
    );
    await sanityWriteClient.patch(id).set({ columns: updatedColumns }).commit();
  }

  return NextResponse.json(task, { status: 201 });
}
