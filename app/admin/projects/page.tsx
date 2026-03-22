import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PmColumn = { id: string; name: string; taskIds: string[] };
type PmProject = {
  _id: string;
  name: string;
  description: string;
  status: "active" | "archived" | "completed";
  dueDate: string | null;
  clientRef: string | null;
  columns: PmColumn[];
  _createdAt: string;
};

function statusColor(status: string) {
  if (status === "active") return "text-green-400 bg-green-400/10";
  if (status === "completed") return "text-sky-400 bg-sky-400/10";
  return "text-white/40 bg-white/5";
}

function statusLabel(status: string) {
  if (status === "active") return "Active";
  if (status === "completed") return "Completed";
  return "Archived";
}

function ProjectCard({ project }: { project: PmProject }) {
  const total = project.columns?.reduce((n, c) => n + (c.taskIds?.length ?? 0), 0) ?? 0;
  const done = project.columns?.find((c) => c.id === "done")?.taskIds?.length ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const isOverdue =
    project.status === "active" &&
    project.dueDate &&
    new Date(project.dueDate) < new Date();

  return (
    <Link
      href={`/admin/projects/${project._id}`}
      className="block p-5 rounded-2xl border border-white/8 hover:border-white/20 bg-white/2 hover:bg-white/4 transition-all group"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white truncate group-hover:text-sky-300 transition-colors">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{project.description}</p>
          )}
        </div>
        <span className={`flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${statusColor(project.status)}`}>
          {statusLabel(project.status)}
        </span>
      </div>

      {total > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[11px] text-white/40 mb-1">
            <span>{done}/{total} tasks</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1 rounded-full bg-white/8 overflow-hidden">
            <div
              className="h-full rounded-full bg-sky-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {(project.dueDate || total === 0) && (
        <div className="flex items-center gap-3 text-[11px]">
          {project.dueDate && (
            <span className={isOverdue ? "text-red-400" : "text-white/30"}>
              Due {new Date(project.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          )}
          {total === 0 && <span className="text-white/20">No tasks yet</span>}
        </div>
      )}
    </Link>
  );
}

export default async function ProjectsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const projects = await sanityServer.fetch<PmProject[]>(`
    *[_type == "pmProject"] | order(status asc, _createdAt desc) {
      _id, name, description, status, dueDate, clientRef, columns, _createdAt
    }
  `);

  const active = projects.filter((p) => p.status === "active");
  const others = projects.filter((p) => p.status !== "active");

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Projects</h1>
          <p className="text-sm text-white/40 mt-1">{active.length} active project{active.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/admin/projects/new"
          className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-semibold text-sm transition-colors"
        >
          + New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-white/10 rounded-2xl">
          <p className="text-white/30 text-sm">No projects yet.</p>
          <Link href="/admin/projects/new" className="mt-3 inline-block text-sm text-sky-400 hover:text-sky-300 transition-colors">
            Create your first project →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {active.map((p) => <ProjectCard key={p._id} project={p} />)}
              </div>
            </div>
          )}

          {others.length > 0 && (
            <div>
              <h2 className="text-xs uppercase tracking-widest text-white/30 mb-3">Archived / Completed</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {others.map((p) => <ProjectCard key={p._id} project={p} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
