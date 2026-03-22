import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import IntegrationsHub from "@/components/admin/integrations/IntegrationsHub";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function IntegrationsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Integrations</h1>
        <p className="text-sm text-white/40 mt-1">Manage connected services and third-party integrations</p>
      </div>
      <IntegrationsHub />
    </div>
  );
}
