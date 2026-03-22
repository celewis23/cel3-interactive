import { NextRequest, NextResponse } from "next/server";
import { sanityServer } from "@/lib/sanityServer";
import { verifyPortalSessionToken, PORTAL_COOKIE } from "@/lib/portal/auth";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get(PORTAL_COOKIE)?.value;
  const session = token ? verifyPortalSessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const user = await sanityServer.fetch<{
      stripeCustomerId: string | null;
      pipelineContactId: string | null;
    } | null>(
      `*[_type == "clientPortalUser" && _id == $id][0]{ stripeCustomerId, pipelineContactId }`,
      { id: session.userId }
    );
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const refs = [user.stripeCustomerId, user.pipelineContactId].filter(Boolean) as string[];

    // Enforce ownership — project must reference this client
    const project = await sanityServer.fetch(
      `*[_type == "pmProject" && _id == $projectId && clientRef in $refs][0]`,
      { projectId: id, refs: refs.length > 0 ? refs : ["__none__"] }
    );
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const tasks = await sanityServer.fetch<Array<{
      _id: string;
      title: string;
      description: string | null;
      columnId: string;
      priority: string | null;
      dueDate: string | null;
      assignee: string | null;
    }>>(
      `*[_type == "pmTask" && projectId == $id] | order(_createdAt asc) {
        _id, title, description, columnId, priority, dueDate, assignee
      }`,
      { id }
    );

    const comments = await sanityServer.fetch<Array<{
      _id: string;
      taskId: string;
      text: string;
      author: string;
      _createdAt: string;
    }>>(
      `*[_type == "pmComment" && taskId in $taskIds] | order(_createdAt asc) {
        _id, taskId, text, author, _createdAt
      }`,
      { taskIds: tasks.map((t) => t._id) }
    );

    return NextResponse.json({ project, tasks, comments });
  } catch (err) {
    console.error("PORTAL_PROJECT_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}
