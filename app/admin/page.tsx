import { sanityServer } from "@/lib/sanityServer";
import Link from "next/link";
import { DateTime } from "luxon";
import QuickActionsClient from "@/components/admin/dashboard/QuickActionsClient";

export const dynamic = "force-dynamic";

const TZ = "America/New_York";

type RecentLead = {
  _id: string;
  name?: string;
  company?: string;
  budget?: string;
  services?: string[];
  createdAt?: string;
};

type UpcomingBooking = {
  _id: string;
  customerName: string;
  customerEmail: string;
  startsAtUtc: string;
  endsAtUtc: string;
};

type RecentSubmission = {
  _id: string;
  formId: string;
  submittedAt: string;
};

type FormInfo = {
  _id: string;
  title: string;
};

export default async function AdminDashboard() {
  const now = DateTime.utc().toISO()!;
  const todayLabel = DateTime.now().setZone(TZ).toFormat("cccc, LLLL d");

  const [
    projectCount,
    leadCount,
    recentLeads,
    upcomingBookings,
    formCount,
    submissionCount,
    recentSubmissions,
    allForms,
  ] = await Promise.all([
    sanityServer.fetch<number>(`count(*[_type == "project"])`),
    sanityServer.fetch<number>(`count(*[_type == "fitRequest"])`),
    sanityServer.fetch<RecentLead[]>(
      `*[_type == "fitRequest"] | order(createdAt desc)[0...5]{ _id, name, company, budget, services, createdAt }`
    ),
    sanityServer.fetch<UpcomingBooking[]>(
      `*[_type == "assessmentBooking" && status == "CONFIRMED" && startsAtUtc >= $now] | order(startsAtUtc asc)[0...4]{ _id, customerName, customerEmail, startsAtUtc, endsAtUtc }`,
      { now }
    ),
    sanityServer.fetch<number>(`count(*[_type == "cel3Form"])`),
    sanityServer.fetch<number>(`count(*[_type == "cel3FormSubmission"])`),
    sanityServer.fetch<RecentSubmission[]>(
      `*[_type == "cel3FormSubmission"] | order(submittedAt desc)[0...5]{ _id, formId, submittedAt }`
    ),
    sanityServer.fetch<FormInfo[]>(`*[_type == "cel3Form"]{ _id, title }`),
  ]);

  const formMap: Record<string, string> = {};
  for (const f of allForms) formMap[f._id] = f.title;

  const budgetColors: Record<string, string> = {
    "$3k–$5k": "bg-sky-500/20 text-sky-300",
    "$5k–$10k": "bg-blue-500/20 text-blue-300",
    "$10k–$25k": "bg-indigo-500/20 text-indigo-300",
    "$25k+": "bg-violet-500/20 text-violet-300",
  };

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-white/30 uppercase tracking-widest mb-1">{todayLabel}</p>
          <h1 className="text-2xl font-semibold text-white">Welcome back</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/case-studies/new"
            className="px-4 py-2 rounded-xl border border-white/10 hover:border-white/25 text-white/60 hover:text-white text-sm transition-colors"
          >
            + Case Study
          </Link>
          <Link
            href="/admin/forms/new"
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-semibold text-sm transition-colors"
          >
            + New Form
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Case Studies", value: projectCount, href: "/admin/case-studies", sub: "published" },
          { label: "Fit Requests", value: leadCount, href: "/admin/analytics", sub: "total leads" },
          { label: "Upcoming Bookings", value: upcomingBookings.length, href: "/admin/bookings", sub: "confirmed" },
          { label: "Active Forms", value: formCount, href: "/admin/forms", sub: "CEL3 Forms" },
          { label: "Submissions", value: submissionCount, href: "/admin/forms", sub: "all forms" },
        ].map(card => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-white/3 border border-white/8 rounded-2xl p-4 hover:border-white/15 transition-colors group"
          >
            <div className="text-2xl font-semibold text-white group-hover:text-sky-400 transition-colors">
              {card.value}
            </div>
            <div className="text-xs text-white/50 mt-1 leading-snug">{card.label}</div>
            <div className="text-xs text-white/20 mt-0.5">{card.sub}</div>
          </Link>
        ))}
      </div>

      {/* Activity grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Fit Requests */}
        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
            <h2 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Recent Fit Requests</h2>
            <Link href="/admin/analytics" className="text-xs text-sky-400 hover:text-sky-300 transition-colors">
              View all →
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <div className="px-5 py-8 text-sm text-white/25 text-center">No leads yet</div>
          ) : (
            <ul className="divide-y divide-white/5">
              {recentLeads.map(l => {
                const name = typeof l.name === "string" ? l.name : "";
                const company = typeof l.company === "string" ? l.company : "";
                const budget = typeof l.budget === "string" ? l.budget : "";
                const services = Array.isArray(l.services) ? l.services.filter((s): s is string => typeof s === "string") : [];
                const relTime = l.createdAt ? DateTime.fromISO(l.createdAt).toRelative() : "";
                return (
                  <li key={l._id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white truncate">{name || "—"}</span>
                      <span className="text-xs text-white/25 shrink-0">{relTime}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {company && <span className="text-xs text-white/35">{company}</span>}
                      {budget && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${budgetColors[budget] || "bg-white/8 text-white/40"}`}>
                          {budget}
                        </span>
                      )}
                      {services.slice(0, 2).map(s => (
                        <span key={s} className="text-xs px-1.5 py-0.5 rounded-full bg-white/5 text-white/35">{s}</span>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Right column: Upcoming bookings + Recent form submissions */}
        <div className="space-y-4">

          {/* Upcoming Assessments */}
          <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
              <h2 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Upcoming Assessments</h2>
              <Link href="/admin/bookings" className="text-xs text-sky-400 hover:text-sky-300 transition-colors">
                View all →
              </Link>
            </div>
            {upcomingBookings.length === 0 ? (
              <div className="px-5 py-6 text-sm text-white/25 text-center">No upcoming bookings</div>
            ) : (
              <ul className="divide-y divide-white/5">
                {upcomingBookings.map(b => {
                  const startEt = DateTime.fromISO(b.startsAtUtc, { zone: "utc" }).setZone(TZ);
                  const endEt = DateTime.fromISO(b.endsAtUtc, { zone: "utc" }).setZone(TZ);
                  const isToday = startEt.hasSame(DateTime.now().setZone(TZ), "day");
                  return (
                    <li key={b._id} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-white truncate">{b.customerName}</span>
                        {isToday && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 shrink-0">Today</span>
                        )}
                      </div>
                      <div className="text-xs text-white/35 mt-0.5">
                        {startEt.toFormat("ccc, LLL d 'at' h:mm a")}–{endEt.toFormat("h:mm a")} ET
                      </div>
                      <div className="text-xs text-white/25">{b.customerEmail}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Recent Form Submissions */}
          <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
              <h2 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Recent Form Submissions</h2>
              <Link href="/admin/forms" className="text-xs text-sky-400 hover:text-sky-300 transition-colors">
                View all →
              </Link>
            </div>
            {recentSubmissions.length === 0 ? (
              <div className="px-5 py-6 text-sm text-white/25 text-center">No submissions yet</div>
            ) : (
              <ul className="divide-y divide-white/5">
                {recentSubmissions.map(s => (
                  <li key={s._id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white/70 truncate">
                        {formMap[s.formId] || "Unknown form"}
                      </div>
                      <div className="text-xs text-white/25 mt-0.5">
                        {DateTime.fromISO(s.submittedAt).toRelative()}
                      </div>
                    </div>
                    <Link
                      href={`/admin/forms/${s.formId}/submissions`}
                      className="text-xs text-sky-400/70 hover:text-sky-400 transition-colors shrink-0"
                    >
                      View →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <QuickActionsClient />

      {/* Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Case Studies", href: "/admin/case-studies", icon: "M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" },
          { label: "Site Content", href: "/admin/content", icon: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" },
          { label: "Analytics", href: "/admin/analytics", icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" },
          { label: "CEL3 Forms", href: "/admin/forms", icon: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" },
        ].map(a => (
          <Link
            key={a.label}
            href={a.href}
            className="flex items-center gap-3 bg-white/3 border border-white/8 rounded-2xl px-4 py-3.5 hover:border-white/15 hover:bg-white/5 transition-colors group"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-white/30 group-hover:text-sky-400 transition-colors shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d={a.icon} />
            </svg>
            <span className="text-sm text-white/60 group-hover:text-white transition-colors">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
