export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import AssetsClient from "@/components/admin/assets/AssetsClient";

export default async function AssetsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] overflow-hidden">
      {/* Page header */}
      <div className="px-6 py-5 border-b border-white/8 flex-shrink-0">
        <h1 className="text-lg font-semibold text-white">Asset Library</h1>
        <p className="text-sm text-white/40 mt-0.5">Files, images, documents, and brand assets</p>
      </div>

      {/* Main content — fills remaining height */}
      <div className="flex-1 overflow-hidden">
        <AssetsClient />
      </div>
    </div>
  );
}
