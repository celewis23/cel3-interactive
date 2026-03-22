import { getPortalUser } from "@/lib/portal/getPortalUser";
import { sanityServer } from "@/lib/sanityServer";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PortalProjectsPage() {
  const user = await getPortalUser();
  const refs = [user.stripeCustomerId, user.pipelineContactId].filter(Boolean) as string[];

  const projects: Array<{
    _id: string;
    name: string;
    status: string;
    dueDate: string | null;
    columns: Array<{ id: string; name: string; taskIds: string[] }>;
    _createdAt: string;
  }> =
    refs.length > 0
      ? await sanityServer
          .fetch(
            `*[_type == "pmProject" && clientRef in $refs] | order(_createdAt desc) {
              _id, name, status, dueDate, columns, _createdAt
            }`,
            { refs }
          )
          .catch(() => [])
      : [];

  const tasks: Array<{ _id: string; projectId: string; columnId: string }> =
    projects.length > 0
      ? await sanityServer
          .fetch(
            `*[_type == "pmTask" && projectId in $ids]{ _id, projectId, columnId }`,
            { ids: projects.map((p) => p._id) }
          )
          .catch(() => [])
      : [];

  const tasksByProject: Record<string, typeof tasks> = {};
  for (const t of tasks) {
    (tasksByProject[t.projectId] = tasksByProject[t.projectId] || []).push(t);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Projects</h1>
        <p className="text-sm text-white/40 mt-1">
          {projects.length} project{projects.length !== 1 ? "s" : ""}
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-8 text-center">
          <p className="text-white/40 text-sm">No projects linked to your account yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {projects.map((p) => {
            const ptasks = tasksByProject[p._id] || [];
            const done = ptasks.filter((t) => t.columnId === "done").length;
            const pct = ptasks.length > 0 ? Math.round((done / ptasks.length) * 100) : 0;
            return (
              <Link
                key={p._id}
                href={`/portal/projects/${p._id}`}
                className="bg-white/3 border border-white/8 rounded-2xl p-5 hover:border-white/20 transition-colors block"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h2 className="text-base font-medium text-white">{p.name}</h2>
                    <p className="text-xs text-white/40 mt-0.5 capitalize">{p.status}</p>
                  </div>
                  {p.dueDate && (
                    <p className="text-xs text-white/40 flex-shrink-0">
                      Due{" "}
                      {new Date(p.dueDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>
                {ptasks.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-white/30">
                        {done}/{ptasks.length} tasks
                      </span>
                      <span className="text-xs text-white/30">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
