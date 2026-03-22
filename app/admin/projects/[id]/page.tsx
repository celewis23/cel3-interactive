import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";
import KanbanBoard from "@/components/admin/projects/KanbanBoard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PmColumn = { id: string; name: string; taskIds: string[] };
type PmProject = {
  _id: string;
  name: string;
  description: string;
  status: string;
  dueDate: string | null;
  clientRef: string | null;
  columns: PmColumn[];
};
type PmTask = {
  _id: string;
  projectId: string;
  columnId: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  assignee: string | null;
  clientRef: string | null;
  driveFileId: string | null;
  driveFileUrl: string | null;
  driveFileName: string | null;
  _createdAt: string;
};

export default async function ProjectBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const { id } = await params;

  const [project, tasks] = await Promise.all([
    sanityServer.fetch<PmProject | null>(`*[_type == "pmProject" && _id == $id][0]`, { id }),
    sanityServer.fetch<PmTask[]>(`*[_type == "pmTask" && projectId == $id]`, { id }),
  ]);

  if (!project) notFound();

  return <KanbanBoard project={project} initialTasks={tasks} />;
}
