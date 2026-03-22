import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";
import PipelineSettings from "@/components/admin/pipeline/PipelineSettings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Stage = { id: string; name: string };

const DEFAULT_STAGES: Stage[] = [
  { id: "new-lead", name: "New Lead" },
  { id: "contacted", name: "Contacted" },
  { id: "proposal", name: "Proposal Sent" },
  { id: "negotiating", name: "Negotiating" },
  { id: "won", name: "Won" },
  { id: "lost", name: "Lost" },
];

export default async function PipelineSettingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const configRaw = await sanityServer.fetch<{ stages: Stage[] } | null>(
    `*[_type == "pipelineConfig" && _id == "pipeline-config"][0]{ stages }`
  );

  const stages = configRaw?.stages ?? DEFAULT_STAGES;

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-1">
        <Link href="/admin/pipeline" className="text-white/30 hover:text-white/70 transition-colors text-sm">
          ← Pipeline
        </Link>
      </div>
      <div className="mb-8 mt-1">
        <h1 className="text-2xl font-semibold text-white">Pipeline Settings</h1>
        <p className="text-sm text-white/40 mt-1">Manage pipeline stages.</p>
      </div>
      <PipelineSettings initialStages={stages} />
    </div>
  );
}
