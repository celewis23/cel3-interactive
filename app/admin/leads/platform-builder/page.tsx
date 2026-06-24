import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { COOKIE_NAME, verifySessionToken } from "@/lib/admin/auth";
import {
  listPlatformBuilderLeads,
  updatePlatformBuilderLeadStatus,
  type PlatformBuilderLeadStatus,
} from "@/lib/platformBuilder/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUSES: Array<{ id: PlatformBuilderLeadStatus; label: string }> = [
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "discovery-scheduled", label: "Discovery Scheduled" },
  { id: "proposal-reviewed", label: "Proposal Reviewed" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
];

async function updateStatusAction(formData: FormData) {
  "use server";

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as PlatformBuilderLeadStatus;
  if (id && status) {
    await updatePlatformBuilderLeadStatus(id, status);
    revalidatePath("/admin/leads/platform-builder");
  }
}

export default async function AdminPlatformBuilderLeadsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const leads = await listPlatformBuilderLeads();

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="mb-2">
            <Link href="/admin/pipeline" className="text-sm text-white/35 transition-colors hover:text-white/70">
              Back to Pipeline
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-white">Platform Builder Leads</h1>
          <p className="mt-1 text-sm text-white/42">
            {leads.length} Build Your Platform submission{leads.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/build-your-platform"
          target="_blank"
          className="rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-200 transition-colors hover:border-sky-300/60 hover:text-white"
        >
          Open Public Builder
        </Link>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/12 py-20 text-center">
          <p className="text-sm text-white/35">No platform builder leads yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {leads.map((lead) => {
            const fullName = `${lead.firstName} ${lead.lastName}`.trim();
            const proposalUrl = `/api/leads/platform-builder/${lead._id}/proposal?token=${lead.proposal.token}`;
            return (
              <article key={lead._id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-white">{lead.businessName}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(lead.status)}`}>
                        {statusLabel(lead.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-white/50">
                      {fullName} - {lead.email} - {lead.phone}
                    </p>
                    <p className="mt-3 text-sm text-white/42">
                      Submitted {new Date(lead._createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px]">
                    <Metric label="Package" value={lead.recommendation.packageName} />
                    <Metric label="Setup" value={lead.recommendation.setupInvestmentRange} />
                    <Metric label="Monthly" value={lead.recommendation.monthlyInvestmentRange} />
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Selected features</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {lead.selectedFeatures.map((feature) => (
                        <span key={feature.id} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/65">
                          {feature.title}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Lead details</p>
                    <dl className="mt-3 grid gap-2 text-sm">
                      <Info label="Budget" value={lead.budgetComfortRange} />
                      <Info label="Timeline" value={lead.desiredTimeline} />
                      <Info label="Feature count" value={String(lead.featureCount)} />
                      <Info label="AI" value={lead.recommendation.aiUsageRecommendation} />
                    </dl>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-white/55">{lead.projectNotes}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 border-t border-white/8 pt-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={proposalUrl}
                      className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-sky-100"
                    >
                      Download Proposal
                    </a>
                    {lead.pipelineContactId ? (
                      <Link
                        href={`/admin/pipeline/contacts/${lead.pipelineContactId}`}
                        className="rounded-xl border border-white/12 px-4 py-2 text-sm text-white/65 transition-colors hover:border-white/25 hover:text-white"
                      >
                        View Pipeline Contact
                      </Link>
                    ) : null}
                  </div>

                  <form action={updateStatusAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={lead._id} />
                    <select
                      name="status"
                      defaultValue={lead.status}
                      className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                    >
                      {STATUSES.map((status) => (
                        <option key={status.id} value={status.id}>{status.label}</option>
                      ))}
                    </select>
                    <button type="submit" className="rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-200">
                      Update
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
      <p className="text-xs text-white/35">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-white/35">{label}</dt>
      <dd className="mt-0.5 text-white/70">{value}</dd>
    </div>
  );
}

function statusLabel(status: PlatformBuilderLeadStatus) {
  return STATUSES.find((item) => item.id === status)?.label ?? status;
}

function statusClass(status: PlatformBuilderLeadStatus) {
  if (status === "won") return "bg-green-400/10 text-green-300";
  if (status === "lost") return "bg-white/8 text-white/35";
  if (status === "discovery-scheduled") return "bg-sky-400/10 text-sky-300";
  if (status === "proposal-reviewed") return "bg-indigo-400/10 text-indigo-300";
  if (status === "contacted") return "bg-amber-400/10 text-amber-300";
  return "bg-white/8 text-white/55";
}
