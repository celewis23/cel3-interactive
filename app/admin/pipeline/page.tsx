import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";
import PipelineBoard from "@/components/admin/pipeline/PipelineBoard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Stage = { id: string; name: string };

type PipelineContact = {
  _id: string;
  _type: string;
  _createdAt: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  notes: string | null;
  owner: string | null;
  stage: string;
  stageEnteredAt: string;
  estimatedValue: number | null;
  stripeCustomerId: string | null;
  closedAt: string | null;
  driveFileUrl: string | null;
  driveFileName: string | null;
  followUpEventId: string | null;
};

const DEFAULT_STAGES: Stage[] = [
  { id: "new-lead", name: "New Lead" },
  { id: "contacted", name: "Contacted" },
  { id: "proposal", name: "Proposal Sent" },
  { id: "negotiating", name: "Negotiating" },
  { id: "won", name: "Won" },
  { id: "lost", name: "Lost" },
];

export default async function PipelinePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const [configRaw, contacts] = await Promise.all([
    sanityServer.fetch<{ stages: Stage[] } | null>(
      `*[_type == "pipelineConfig" && _id == "pipeline-config"][0]{ stages }`
    ),
    sanityServer.fetch<PipelineContact[]>(
      `*[_type == "pipelineContact"] | order(stageEnteredAt desc) {
        _id, _type, _createdAt,
        name, email, phone, company, source, notes, owner,
        stage, stageEnteredAt, estimatedValue, stripeCustomerId,
        closedAt, driveFileUrl, driveFileName, followUpEventId
      }`
    ),
  ]);

  const stages = configRaw?.stages ?? DEFAULT_STAGES;

  return (
    <div className="flex flex-col h-full -mx-4 lg:-mx-8">
      {/* Header */}
      <div className="px-4 lg:px-8 mb-6 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-white">Pipeline</h1>
          <p className="text-sm text-white/40 mt-1">
            {contacts.filter((c) => c.stage !== "won" && c.stage !== "lost").length} active leads
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/pipeline/contacts"
            className="text-sm text-white/50 hover:text-white transition-colors"
          >
            View as list →
          </Link>
          <Link
            href="/admin/pipeline/contacts/new"
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-semibold text-sm transition-colors"
          >
            + New Contact
          </Link>
        </div>
      </div>

      <PipelineBoard initialContacts={contacts} stages={stages} />
    </div>
  );
}
