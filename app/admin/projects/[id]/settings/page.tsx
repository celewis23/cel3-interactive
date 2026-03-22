import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";
import ProjectSettingsForm from "@/components/admin/projects/ProjectSettingsForm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PmColumn = { id: string; name: string; taskIds: string[] };
type PmProject = {
  _id: string;
  name: string;
  description: string;
  status: string;
  dueDate: string | null;
  columns: PmColumn[];
};

export default async function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const { id } = await params;
  const project = await sanityServer.fetch<PmProject | null>(
    `*[_type == "pmProject" && _id == $id][0]`,
    { id }
  );
  if (!project) notFound();

  return (
    <div className="max-w-xl">
      <div className="mb-8 flex items-center gap-3">
        <a href={`/admin/projects/${id}`} className="text-white/30 hover:text-white/70 transition-colors text-sm">
          ← Board
        </a>
        <span className="text-white/20">/</span>
        <h1 className="text-xl font-semibold text-white">Settings</h1>
      </div>
      <ProjectSettingsForm project={project} />
    </div>
  );
}
