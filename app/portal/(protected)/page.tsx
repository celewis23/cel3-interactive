import { getPortalUser } from "@/lib/portal/getPortalUser";
import { listInvoices } from "@/lib/stripe/billing";
import { sanityServer } from "@/lib/sanityServer";
import { listPortalAppointmentsWithResponses } from "@/lib/portal/appointments";
import { getUnreadCount } from "@/lib/messaging/service";
import { getRecentSentCampaigns } from "@/lib/campaigns/db";
import type { MessagingActor } from "@/lib/messaging/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatApptDate(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const apptDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((apptDay.getTime() - today.getTime()) / 86_400_000);
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (diff === 0) return `Today at ${time}`;
  if (diff === 1) return `Tomorrow at ${time}`;
  if (diff < 7) return `${date.toLocaleDateString("en-US", { weekday: "long" })} at ${time}`;
  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${time}`;
}

function statusStyle(status: string) {
  switch (status.toLowerCase().replace(/[\s_]/g, "")) {
    case "completed": return "text-emerald-400 bg-emerald-400/10";
    case "active":
    case "inprogress": return "text-sky-400 bg-sky-400/10";
    case "review":
    case "inreview": return "text-purple-400 bg-purple-400/10";
    case "onhold": return "text-amber-400 bg-amber-400/10";
    default: return "text-white/45 bg-white/5";
  }
}

function statusLabel(s: string) {
  return s.replace(/[_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function PortalDashboard() {
  const user = await getPortalUser();

  const actor: MessagingActor = {
    kind: "client",
    actorId: `portal:${user._id}`,
    userId: user._id,
    name: user.name ?? "",
    email: user.email,
    company: user.company ?? null,
    stripeCustomerId: user.stripeCustomerId ?? null,
    pipelineContactId: user.pipelineContactId ?? null,
    avatarUrl: null,
  };

  const refs = [user.stripeCustomerId, user.pipelineContactId].filter(Boolean) as string[];

  const [invoiceData, projects, estimates, siteAccess, allAppointments, recentCampaigns, unsignedContracts, unreadMessages] =
    await Promise.all([
      user.stripeCustomerId
        ? listInvoices({ customerId: user.stripeCustomerId, status: "open", limit: 50 }).catch(() => ({ invoices: [] }))
        : Promise.resolve({ invoices: [] }),
      refs.length > 0
        ? sanityServer
            .fetch<Array<{ _id: string; name: string; status: string; _createdAt: string }>>(
              `*[_type == "pmProject" && clientRef in $refs] | order(_createdAt desc) [0...5]{ _id, name, status, _createdAt }`,
              { refs }
            )
            .catch(() => [])
        : Promise.resolve([]),
      sanityServer
        .fetch<Array<{ status: string; total: number; _createdAt: string }>>(
          `*[_type == "estimate" && status in ["sent","viewed","approved"] && (
            stripeCustomerId == $s || pipelineContactId == $p || clientEmail == $e
          )]{ status, total, _createdAt }`,
          { s: user.stripeCustomerId ?? "__none__", p: user.pipelineContactId ?? "__none__", e: user.email }
        )
        .catch(() => []),
      user.pipelineContactId
        ? sanityServer
            .fetch<{ siteUrl: string | null; managementUrl: string | null } | null>(
              `*[_type == "pipelineContact" && _id == $id][0]{ siteUrl, managementUrl }`,
              { id: user.pipelineContactId }
            )
            .catch(() => null)
        : Promise.resolve(null),
      listPortalAppointmentsWithResponses(user.email).catch(() => []),
      getRecentSentCampaigns(3).catch(() => []),
      sanityServer
        .fetch<Array<{ _id: string; number: string; signingToken: string; templateName: string | null }>>(
          `*[_type == "contract" && status in ["sent","viewed"] && (
            portalUserId == $userId || stripeCustomerId == $stripeId || pipelineContactId == $contactId || clientEmail == $email
          )] | order(_createdAt desc){ _id, number, signingToken, templateName }`,
          {
            userId: user._id,
            stripeId: user.stripeCustomerId ?? "__none__",
            contactId: user.pipelineContactId ?? "__none__",
            email: user.email,
          }
        )
        .catch(() => []),
      getUnreadCount(actor).catch(() => 0),
    ]);

  const openInvoices = invoiceData.invoices;
  const outstandingTotal = openInvoices.reduce((s, inv) => s + inv.amountDue, 0);
  const pendingEstimates = estimates.filter((e) => ["sent", "viewed"].includes(e.status));

  const effectiveSiteUrl = user.siteUrl ?? siteAccess?.siteUrl ?? null;
  const effectiveManagementUrl = user.managementUrl ?? siteAccess?.managementUrl ?? null;

  const nowMs = Date.now();
  const upcomingAppt = allAppointments
    .filter((e) => {
      const start = e.start.dateTime ?? e.start.date ?? "";
      return start && new Date(start).getTime() > nowMs;
    })
    .sort((a, b) => {
      const aT = new Date(a.start.dateTime ?? a.start.date ?? "").getTime();
      const bT = new Date(b.start.dateTime ?? b.start.date ?? "").getTime();
      return aT - bT;
    })[0] ?? null;

  const hasActionItems =
    openInvoices.length > 0 || pendingEstimates.length > 0 || unsignedContracts.length > 0;

  const firstName = user.name?.split(" ")[0] ?? null;

  type ActivityItem = { type: string; label: string; sub: string; href: string; date: number };
  const activity: ActivityItem[] = [
    ...openInvoices.slice(0, 2).map((inv) => ({
      type: "invoice",
      label: `Invoice ${inv.number ?? inv.id}`,
      sub: `${money(inv.amountDue)} · Open`,
      href: `/portal/invoices/${inv.id}`,
      date: inv.created * 1000,
    })),
    ...projects.slice(0, 3).map((p) => ({
      type: "project",
      label: p.name,
      sub: statusLabel(p.status),
      href: `/portal/projects/${p._id}`,
      date: new Date(p._createdAt).getTime(),
    })),
  ]
    .sort((a, b) => b.date - a.date)
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-8 pb-4">
      {/* ── What's New ───────────────────────────────────── */}
      {recentCampaigns.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">What&rsquo;s New from CEL3 Interactive</h2>
          </div>
          <div className="flex flex-col gap-2">
            {recentCampaigns.map((c) => (
              <Link
                key={c.id}
                href={`/portal/campaigns/${c.id}`}
                className="flex items-center justify-between bg-gradient-to-r from-sky-500/5 to-transparent border border-sky-500/15 rounded-xl px-4 py-3.5 hover:border-sky-500/30 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{c.subject}</p>
                    <p className="text-xs text-white/35 mt-0.5">
                      {c.sentAt ? new Date(c.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-sky-400/70 group-hover:text-sky-400 transition-colors flex-shrink-0 ml-3">Read →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Hero ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          {firstName ? `Welcome back, ${firstName}.` : "Welcome back."}
        </h1>
        <p className="text-sm text-white/40 mt-1">{user.company ?? user.email}</p>

        {(effectiveSiteUrl || effectiveManagementUrl) && (
          <div className="mt-6 flex flex-wrap gap-3">
            {effectiveSiteUrl && (
              <a
                href={effectiveSiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
                View My Site
              </a>
            )}
            {effectiveManagementUrl && (
              <Link
                href="/portal/manage-site"
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Manage My Site
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── Action Required ──────────────────────────────── */}
      {hasActionItems && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-amber-400 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span className="text-sm font-semibold text-amber-400">Action Required</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {openInvoices.length > 0 && (
              <Link
                href="/portal/invoices"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 text-sm transition-colors"
              >
                {openInvoices.length} open invoice{openInvoices.length !== 1 ? "s" : ""} · {money(outstandingTotal)}
                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            )}
            {unsignedContracts.length > 0 && (
              <Link
                href="/portal/contracts"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 text-sm transition-colors"
              >
                {unsignedContracts.length} contract{unsignedContracts.length !== 1 ? "s" : ""} awaiting signature
                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            )}
            {pendingEstimates.length > 0 && (
              <Link
                href="/portal/estimates"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 text-sm transition-colors"
              >
                {pendingEstimates.length} estimate{pendingEstimates.length !== 1 ? "s" : ""} awaiting response
                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── Quick Actions ─────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/portal/messages"
          className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/10 bg-white/3 hover:bg-white/7 hover:border-white/20 text-white text-sm font-medium transition-colors"
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
          Message Your Team
          {unreadMessages > 0 && (
            <span className="h-5 min-w-[20px] px-1 flex items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-black">
              {unreadMessages > 99 ? "99+" : unreadMessages}
            </span>
          )}
        </Link>
        <Link
          href="/portal/requests"
          className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/10 bg-white/3 hover:bg-white/7 hover:border-white/20 text-white text-sm font-medium transition-colors"
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Request
        </Link>
        <Link
          href="/portal/appointments"
          className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-white/10 bg-white/3 hover:bg-white/7 hover:border-white/20 text-white text-sm font-medium transition-colors"
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
          </svg>
          Book Appointment
        </Link>
      </div>

      {/* ── Status Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/portal/messages"
          className={`rounded-2xl border p-5 transition-colors block ${
            unreadMessages > 0
              ? "border-sky-500/30 bg-sky-500/5 hover:border-sky-500/50"
              : "border-white/8 bg-white/3 hover:border-white/20"
          }`}
        >
          <p className="text-xs text-white/50 mb-2">Messages</p>
          {unreadMessages > 0 ? (
            <>
              <p className="text-2xl font-semibold text-sky-400">{unreadMessages}</p>
              <p className="text-xs text-white/30 mt-1">unread from your team</p>
            </>
          ) : (
            <p className="text-sm font-medium text-white/40 mt-1">All caught up</p>
          )}
        </Link>

        <Link
          href="/portal/appointments"
          className="rounded-2xl border border-white/8 bg-white/3 p-5 hover:border-white/20 transition-colors block"
        >
          <p className="text-xs text-white/50 mb-2">Next Appointment</p>
          {upcomingAppt ? (
            <>
              <p className="text-sm font-medium text-white leading-snug line-clamp-1">
                {upcomingAppt.summary ?? "Appointment"}
              </p>
              <p className="text-xs text-white/40 mt-1">
                {formatApptDate(upcomingAppt.start.dateTime ?? upcomingAppt.start.date ?? "")}
              </p>
            </>
          ) : (
            <p className="text-sm font-medium text-white/40 mt-1">None scheduled</p>
          )}
        </Link>

        <Link
          href="/portal/projects"
          className="rounded-2xl border border-white/8 bg-white/3 p-5 hover:border-white/20 transition-colors block"
        >
          <p className="text-xs text-white/50 mb-2">Active Projects</p>
          <p className="text-2xl font-semibold text-white">{projects.length}</p>
          {projects.length > 0 && (
            <p className="text-xs text-white/30 mt-1">
              {projects.filter((p) => ["active", "in_progress", "in progress"].includes(p.status.toLowerCase())).length} in progress
            </p>
          )}
        </Link>

        <Link
          href="/portal/invoices"
          className={`rounded-2xl border p-5 transition-colors block ${
            outstandingTotal > 0
              ? "border-yellow-500/30 bg-yellow-500/5 hover:border-yellow-500/50"
              : "border-white/8 bg-white/3 hover:border-white/20"
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
      </div>

      {/* ── Projects ─────────────────────────────────────── */}
      {projects.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Projects</h2>
            <Link href="/portal/projects" className="text-xs text-sky-400 hover:text-sky-300 transition-colors">
              View all →
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {projects.map((p) => (
              <Link
                key={p._id}
                href={`/portal/projects/${p._id}`}
                className="flex items-center justify-between bg-white/3 border border-white/8 rounded-xl px-4 py-3.5 hover:border-white/20 transition-colors group"
              >
                <p className="text-sm text-white">{p.name}</p>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyle(p.status)}`}>
                  {statusLabel(p.status)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Recent Activity ───────────────────────────────── */}
      {activity.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Recent Activity</h2>
          <div className="flex flex-col gap-2">
            {activity.map((item, i) => (
              <Link
                key={i}
                href={item.href}
                className="flex items-center justify-between bg-white/3 border border-white/8 rounded-xl px-4 py-3 hover:border-white/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      item.type === "invoice"
                        ? "bg-yellow-400"
                        : item.type === "project"
                          ? "bg-sky-400"
                          : "bg-emerald-400"
                    }`}
                  />
                  <p className="text-sm text-white">{item.label}</p>
                </div>
                <span className="text-xs text-white/40">{item.sub}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
