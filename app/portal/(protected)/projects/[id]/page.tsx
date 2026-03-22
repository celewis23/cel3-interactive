import { getPortalUser } from "@/lib/portal/getPortalUser";
import { sanityServer } from "@/lib/sanityServer";
import { notFound } from "next/navigation";
import Link from "next/link";
import ReadOnlyBoard from "@/components/portal/ReadOnlyBoard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PortalProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [user, { id }] = await Promise.all([getPortalUser(), params]);
  const refs = [user.stripeCustomerId, user.pipelineContactId].filter(Boolean) as string[];

  const project = await sanityServer
    .fetch<{
      _id: string;
      name: string;
      status: string;
      description: string | null;
      dueDate: string | null;
      columns: Array<{ id: string; name: string; taskIds: string[] }>;
    } | null>(
      `*[_type == "pmProject" && _id == $projectId && clientRef in $refs][0]{
        _id, name, status, description, dueDate, columns
      }`,
      { projectId: id, refs: refs.length > 0 ? refs : ["__none__"] }
    )
    .catch(() => null);

  if (!project) notFound();

  const [tasks, comments] = await Promise.all([
    sanityServer.fetch<
      Array<{
        _id: string;
        title: string;
        description: string | null;
        columnId: string;
        priority: string | null;
        dueDate: string | null;
        assignee: string | null;
      }>
    >(
      `*[_type == "pmTask" && projectId == $id] | order(_createdAt asc) {
        _id, title, description, columnId, priority, dueDate, assignee
      }`,
      { id }
    ).catch(() => []),
    sanityServer.fetch<
      Array<{ _id: string; taskId: string; text: string; author: string; _createdAt: string }>
    >(
      `*[_type == "pmComment" && taskId in $taskIds] | order(_createdAt asc) {
        _id, taskId, text, author, _createdAt
      }`,
      { taskIds: [] }
    ).catch(() => []),
  ]);

  // Fetch comments for actual task IDs
  const taskIds = tasks.map((t) => t._id);
  const allComments =
    taskIds.length > 0
      ? await sanityServer
          .fetch<Array<{ _id: string; taskId: string; text: string; author: string; _createdAt: string }>>(
            `*[_type == "pmComment" && taskId in $taskIds] | order(_createdAt asc) {
              _id, taskId, text, author, _createdAt
            }`,
            { taskIds }
          )
          .catch(() => [])
      : [];

  void comments; // suppress unused warning

  const done = tasks.filter((t) => t.columnId === "done").length;
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link href="/portal/projects" className="text-white/40 hover:text-white transition-colors text-sm">
          ← Projects
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">{project.name}</h1>
          <p className="text-sm text-white/40 mt-1 capitalize">{project.status}</p>
        </div>
        {project.dueDate && (
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-white/40">Due date</p>
            <p className="text-sm text-white">
              {new Date(project.dueDate).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        )}
      </div>

      {/* Progress */}
      {tasks.length > 0 && (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/50">Progress</span>
            <span className="text-xs text-white/50">
              {done}/{tasks.length} tasks · {pct}%
            </span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {project.description && (
        <p className="text-sm text-white/60 leading-relaxed">{project.description}</p>
      )}

      {/* Board */}
      <div>
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
          Board (read-only)
        </h2>
        <ReadOnlyBoard
          columns={project.columns ?? []}
          tasks={tasks}
          comments={allComments}
        />
      </div>
    </div>
  );
}
