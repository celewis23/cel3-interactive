import { NextRequest, NextResponse } from "next/server";
import { sanityServer } from "@/lib/sanityServer";
import { verifyPortalSessionToken, PORTAL_COOKIE } from "@/lib/portal/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(PORTAL_COOKIE)?.value;
  const session = token ? verifyPortalSessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await sanityServer.fetch<{
      stripeCustomerId: string | null;
      pipelineContactId: string | null;
    } | null>(
      `*[_type == "clientPortalUser" && _id == $id][0]{ stripeCustomerId, pipelineContactId }`,
      { id: session.userId }
    );
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const refs = [user.stripeCustomerId, user.pipelineContactId].filter(Boolean) as string[];
    if (refs.length === 0) return NextResponse.json([]);

    const projects = await sanityServer.fetch<Array<{
      _id: string;
      name: string;
      status: string;
      dueDate: string | null;
      columns: Array<{ id: string; name: string; taskIds: string[] }>;
      _createdAt: string;
    }>>(
      `*[_type == "pmProject" && (clientRef in $refs)] | order(_createdAt desc) {
        _id, name, status, dueDate, columns, _createdAt
      }`,
      { refs }
    );

    if (projects.length === 0) return NextResponse.json([]);

    const tasks = await sanityServer.fetch<Array<{ _id: string; projectId: string; columnId: string }>>(
      `*[_type == "pmTask" && projectId in $ids]{ _id, projectId, columnId }`,
      { ids: projects.map((p) => p._id) }
    );

    const tasksByProject: Record<string, typeof tasks> = {};
    for (const t of tasks) {
      (tasksByProject[t.projectId] = tasksByProject[t.projectId] || []).push(t);
    }

    const result = projects.map((p) => {
      const ptasks = tasksByProject[p._id] || [];
      const done = ptasks.filter((t) => t.columnId === "done").length;
      return {
        ...p,
        taskTotal: ptasks.length,
        taskDone: done,
        pct: ptasks.length > 0 ? Math.round((done / ptasks.length) * 100) : 0,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("PORTAL_PROJECTS_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}
