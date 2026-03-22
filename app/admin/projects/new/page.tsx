import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import NewProjectForm from "@/components/admin/projects/NewProjectForm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewProjectPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">New Project</h1>
        <p className="text-sm text-white/40 mt-1">Set up a new project with a Kanban board.</p>
      </div>
      <NewProjectForm />
    </div>
  );
}
