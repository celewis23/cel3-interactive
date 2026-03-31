import { getPortalUser } from "@/lib/portal/getPortalUser";
import { listInvoices } from "@/lib/stripe/billing";
import { sanityServer } from "@/lib/sanityServer";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function PortalDashboard() {
  const user = await getPortalUser();

  const refs = [user.stripeCustomerId, user.pipelineContactId].filter(Boolean) as string[];

  const [invoiceData, projects, estimates, siteAccess] = await Promise.all([
    user.stripeCustomerId
      ? listInvoices({ customerId: user.stripeCustomerId, status: "open", limit: 50 }).catch(
          () => ({ invoices: [] })
        )
      : Promise.resolve({ invoices: [] }),
    refs.length > 0
      ? sanityServer
          .fetch<Array<{ _id: string; name: string; status: string }>>(
            `*[_type == "pmProject" && clientRef in $refs] | order(_createdAt desc) [0...5]{ _id, name, status }`,
            { refs }
          )
          .catch(() => [])
      : Promise.resolve([]),
    sanityServer
      .fetch<Array<{ status: string; total: number }>>(
        `*[_type == "estimate" && status in ["sent","viewed","approved"] && (
          stripeCustomerId == $s || pipelineContactId == $p || clientEmail == $e
        )]{ status, total }`,
        {
          s: user.stripeCustomerId ?? "__none__",
          p: user.pipelineContactId ?? "__none__",
          e: user.email,
        }
      )
      .catch(() => []),
    user.pipelineContactId
      ? sanityServer.fetch<{ siteUrl: string | null; managementUrl: string | null } | null>(
          `*[_type == "pipelineContact" && _id == $id][0]{ siteUrl, managementUrl }`,
          { id: user.pipelineContactId }
        ).catch(() => null)
      : Promise.resolve(null),
  ]);

  const openInvoices = invoiceData.invoices;
  const outstandingTotal = openInvoices.reduce((s, inv) => s + inv.amountDue, 0);
  const pendingEstimates = estimates.filter((e) => ["sent", "viewed"].includes(e.status));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          {user.name ? `Welcome back, ${user.name.split(" ")[0]}` : "Welcome back"}
        </h1>
        <p className="text-sm text-white/40 mt-1">{user.company ?? user.email}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/portal/invoices"
          className={`bg-white/3 border rounded-2xl p-5 hover:border-white/20 transition-colors block ${
            outstandingTotal > 0 ? "border-yellow-500/30" : "border-white/8"
          }`}
        >
          <p className="text-xs text-white/50 mb-2">Outstanding</p>
          <p className={`text-2xl font-semibold ${outstandingTotal > 0 ? "text-yellow-400" : "text-white"}`}>
            {money(outstandingTotal)}
          </p>
          {openInvoices.length > 0 && (
            <p className="text-xs text-white/30 mt-1">
              {openInvoices.length} invoice{openInvoices.length !== 1 ? "s" : ""}
            </p>
          )}
        </Link>

        <Link
          href="/portal/projects"
          className="bg-white/3 border border-white/8 rounded-2xl p-5 hover:border-white/20 transition-colors block"
        >
          <p className="text-xs text-white/50 mb-2">Active Projects</p>
          <p className="text-2xl font-semibold text-white">{projects.length}</p>
        </Link>

        <Link
          href="/portal/estimates"
          className={`bg-white/3 border rounded-2xl p-5 hover:border-white/20 transition-colors block ${
            pendingEstimates.length > 0 ? "border-sky-500/30" : "border-white/8"
          }`}
        >
          <p className="text-xs text-white/50 mb-2">Pending Estimates</p>
          <p className={`text-2xl font-semibold ${pendingEstimates.length > 0 ? "text-sky-400" : "text-white"}`}>
            {pendingEstimates.length}
          </p>
          {pendingEstimates.length > 0 && (
            <p className="text-xs text-white/30 mt-1">awaiting your response</p>
          )}
        </Link>

        <Link
          href="/portal/requests"
          className="bg-white/3 border border-white/8 rounded-2xl p-5 hover:border-white/20 transition-colors block"
        >
          <p className="text-xs text-white/50 mb-2">Requests</p>
          <p className="text-sm font-medium text-white/60 mt-1">Submit work requests →</p>
        </Link>

        <Link
          href="/portal/appointments"
          className="bg-white/3 border border-white/8 rounded-2xl p-5 hover:border-white/20 transition-colors block"
        >
          <p className="text-xs text-white/50 mb-2">Appointments</p>
          <p className="text-sm font-medium text-white/60 mt-1">View calendar →</p>
        </Link>

        {(siteAccess?.managementUrl || user.managementUrl || siteAccess?.siteUrl || user.siteUrl) && (
          <a
            href={(siteAccess?.managementUrl || user.managementUrl) ? "/portal/manage-site" : ((siteAccess?.siteUrl || user.siteUrl) as string)}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/3 border border-white/8 rounded-2xl p-5 hover:border-white/20 transition-colors block"
          >
            <p className="text-xs text-white/50 mb-2">Site Access</p>
            <p className="text-sm font-medium text-white/60 mt-1">
              {(siteAccess?.managementUrl || user.managementUrl) ? "Manage site →" : "Open website →"}
            </p>
          </a>
        )}
      </div>

      {/* Open Invoices */}
      {openInvoices.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
              Open Invoices
            </h2>
            <Link href="/portal/invoices" className="text-xs text-sky-400 hover:text-sky-300 transition-colors">
              View all →
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {openInvoices.slice(0, 3).map((inv) => (
              <Link
                key={inv.id}
                href={`/portal/invoices/${inv.id}`}
                className="flex items-center justify-between bg-white/3 border border-white/8 rounded-xl px-4 py-3 hover:border-white/20 transition-colors"
              >
                <div>
                  <p className="text-sm text-white">{inv.number ?? inv.id}</p>
                  <p className="text-xs text-white/40">
                    {new Date(inv.created * 1000).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{money(inv.amountDue)}</p>
                  <span className="text-xs text-yellow-400">Open</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
              Projects
            </h2>
            <Link href="/portal/projects" className="text-xs text-sky-400 hover:text-sky-300 transition-colors">
              View all →
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {projects.map((p) => (
              <Link
                key={p._id}
                href={`/portal/projects/${p._id}`}
                className="flex items-center justify-between bg-white/3 border border-white/8 rounded-xl px-4 py-3 hover:border-white/20 transition-colors"
              >
                <p className="text-sm text-white">{p.name}</p>
                <span className="text-xs text-white/40 capitalize">{p.status}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Pending estimates */}
      {pendingEstimates.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
              Estimates Awaiting Response
            </h2>
            <Link href="/portal/estimates" className="text-xs text-sky-400 hover:text-sky-300 transition-colors">
              Review →
            </Link>
          </div>
          <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl px-4 py-3">
            <p className="text-sm text-sky-300">
              You have {pendingEstimates.length} estimate{pendingEstimates.length !== 1 ? "s" : ""} waiting for your approval.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
