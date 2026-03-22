import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import AuditLogView from "@/components/admin/audit/AuditLogView";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AuditLogPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Audit Log</h1>
        <p className="text-sm text-white/40 mt-1">Full activity history across all modules</p>
      </div>
      <AuditLogView />
    </div>
  );
}
