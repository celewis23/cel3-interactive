import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Stage = { id: string; name: string };

type PipelineContact = {
  _id: string;
  _createdAt: string;
  name: string;
  company: string | null;
  stage: string;
  stageEnteredAt: string;
  estimatedValue: number | null;
};

const DEFAULT_STAGES: Stage[] = [
  { id: "new-lead", name: "New Lead" },
  { id: "contacted", name: "Contacted" },
  { id: "proposal", name: "Proposal Sent" },
  { id: "negotiating", name: "Negotiating" },
  { id: "won", name: "Won" },
  { id: "lost", name: "Lost" },
];

function stageBadgeClass(stageId: string) {
  if (stageId === "won") return "text-green-400 bg-green-400/10";
  if (stageId === "lost") return "text-white/30 bg-white/5";
  if (stageId === "negotiating") return "text-yellow-400 bg-yellow-400/10";
  if (stageId === "proposal") return "text-sky-400 bg-sky-400/10";
  return "text-white/50 bg-white/5";
}

function daysInStage(stageEnteredAt: string) {
  const entered = new Date(stageEnteredAt).getTime();
  const now = Date.now();
  return Math.floor((now - entered) / 86400000);
}

export default async function PipelineContactsPage() {
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
        _id, _createdAt, name, company, stage, stageEnteredAt, estimatedValue
      }`
    ),
  ]);

  const stages = configRaw?.stages ?? DEFAULT_STAGES;
  const stageMap = Object.fromEntries(stages.map((s) => [s.id, s.name]));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/admin/pipeline" className="text-white/30 hover:text-white/70 transition-colors text-sm">
              ← Pipeline
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-white">All Contacts</h1>
          <p className="text-sm text-white/40 mt-1">{contacts.length} contact{contacts.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/pipeline/settings"
            className="text-xs text-white/30 hover:text-white/70 transition-colors px-3 py-1.5 rounded-lg border border-white/8 hover:border-white/20"
          >
            Settings
          </Link>
          <Link
            href="/admin/pipeline/contacts/new"
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-semibold text-sm transition-colors"
          >
            + New Contact
          </Link>
        </div>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-white/10 rounded-2xl">
          <p className="text-white/30 text-sm">No contacts yet.</p>
          <Link href="/admin/pipeline/contacts/new" className="mt-3 inline-block text-sm text-sky-400 hover:text-sky-300 transition-colors">
            Add your first contact →
          </Link>
        </div>
      ) : (
        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/8">
                <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider hidden md:table-cell">Company</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Stage</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider hidden lg:table-cell">Value</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider hidden lg:table-cell">Days in Stage</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider hidden xl:table-cell">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {contacts.map((contact) => (
                <tr
                  key={contact._id}
                  className="hover:bg-white/3 transition-colors group"
                >
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/admin/pipeline/contacts/${contact._id}`}
                      className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors"
                    >
                      {contact.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className="text-sm text-white/50">{contact.company || "—"}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stageBadgeClass(contact.stage)}`}>
                      {stageMap[contact.stage] ?? contact.stage}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <span className="text-sm text-sky-400">
                      {contact.estimatedValue != null ? `$${contact.estimatedValue.toLocaleString()}` : "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <span className="text-sm text-white/30">{daysInStage(contact.stageEnteredAt)}d</span>
                  </td>
                  <td className="px-5 py-3.5 hidden xl:table-cell">
                    <span className="text-sm text-white/30">
                      {new Date(contact._createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
