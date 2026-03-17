import CaseStudyForm from "@/components/admin/CaseStudyForm";
import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

export default async function NewCaseStudyPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  return (
    <div>
      <div className="mb-8">
        <div className="text-xs text-white/40 mb-1">
          <a href="/admin/case-studies" className="hover:text-white/60">Case Studies</a> /
          <span className="ml-1">New</span>
        </div>
        <h1 className="text-2xl font-semibold text-white">New Case Study</h1>
      </div>
      <CaseStudyForm mode="create" />
    </div>
  );
}
