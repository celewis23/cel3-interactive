import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import TrafficDashboard from "./TrafficDashboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function TrafficPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Web Traffic</h1>
        <p className="text-sm text-white/40 mt-1">
          First-party website analytics — visitors, pages, and sources
        </p>
      </div>
      <TrafficDashboard />
    </div>
  );
}
