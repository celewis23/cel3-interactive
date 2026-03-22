import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";
import { listInvoices } from "@/lib/stripe/billing";
import { listEvents } from "@/lib/google/calendar";

export const runtime = "nodejs";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const session = verifySessionToken(token);
  return session?.step === "full";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthKey(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function startOfMonthUnix(offsetMonths = 0): number {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() + offsetMonths);
  return Math.floor(d.getTime() / 1000);
}

// ── Revenue (Stripe) ──────────────────────────────────────────────────────────

async function fetchRevenue() {
  // Fetch up to 100 paid invoices and up to 100 open invoices in parallel
  const [paidRes, openRes] = await Promise.all([
    listInvoices({ status: "paid", limit: 100 }),
    listInvoices({ status: "open", limit: 100 }),
  ]);

  const paid = paidRes.invoices;
  const open = openRes.invoices;
  const currency = paid[0]?.currency ?? open[0]?.currency ?? "usd";

  const thisMonthStart = startOfMonthUnix(0);
  const lastMonthStart = startOfMonthUnix(-1);
  const twelveMonthsAgo = startOfMonthUnix(-12);
  const nowUnix = Math.floor(Date.now() / 1000);

  // Revenue this month / last month
  const revenueThisMonth = paid
    .filter((i) => i.created >= thisMonthStart)
    .reduce((s, i) => s + i.amountPaid, 0);

  const revenueLastMonth = paid
    .filter((i) => i.created >= lastMonthStart && i.created < thisMonthStart)
    .reduce((s, i) => s + i.amountPaid, 0);

  const changePercent =
    revenueLastMonth > 0
      ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
      : null;

  // Monthly trend — last 12 months
  const monthlyCents: Record<string, number> = {};
  for (const inv of paid) {
    if (inv.created < twelveMonthsAgo) continue;
    const key = monthKey(inv.created);
    monthlyCents[key] = (monthlyCents[key] ?? 0) + inv.amountPaid;
  }
  // Fill any missing months with 0
  for (let m = -11; m <= 0; m++) {
    const key = monthKey(startOfMonthUnix(m) + 86400); // +1 day to stay in month
    if (!(key in monthlyCents)) monthlyCents[key] = 0;
  }
  const monthly12 = Object.entries(monthlyCents)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount }));

  // Revenue by client (top 8)
  const byClientCents: Record<string, { name: string; amount: number }> = {};
  for (const inv of paid) {
    const key = inv.customerId || inv.customerEmail || "Unknown";
    const name = inv.customerName || inv.customerEmail || "Unknown";
    if (!byClientCents[key]) byClientCents[key] = { name, amount: 0 };
    byClientCents[key].amount += inv.amountPaid;
  }
  const byClient = Object.values(byClientCents)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  // Outstanding + overdue
  const outstanding = open.reduce((s, i) => s + i.amountDue, 0);
  const overdueOpen = open.filter((i) => i.dueDate && i.dueDate < nowUnix);
  const overdue = overdueOpen.reduce((s, i) => s + i.amountDue, 0);

  return {
    thisMonth: revenueThisMonth,
    lastMonth: revenueLastMonth,
    currency,
    changePercent,
    outstanding,
    outstandingCount: open.length,
    overdue,
    overdueCount: overdueOpen.length,
    monthly12,
    byClient,
  };
}

// ── Project Health (Sanity PM) ────────────────────────────────────────────────

async function fetchProjectHealth() {
  const [projects, tasks] = await Promise.all([
    sanityServer.fetch<Array<{
      _id: string;
      name: string;
      status: string;
      dueDate: string | null;
      columns: Array<{ id: string; name: string; taskIds: string[] }>;
    }>>(`*[_type == "pmProject" && status == "active"]{ _id, name, status, dueDate, columns }`),
    sanityServer.fetch<Array<{
      _id: string;
      projectId: string;
      columnId: string;
      dueDate: string | null;
    }>>(`*[_type == "pmTask"]{ _id, projectId, columnId, dueDate }`),
  ]);

  const todayStr = new Date().toISOString().slice(0, 10);

  const projectSummaries = projects.map((p) => {
    const total = (p.columns ?? []).reduce((n, c) => n + (c.taskIds?.length ?? 0), 0);
    const doneCol = (p.columns ?? []).find((c) => c.id === "done");
    const done = doneCol?.taskIds?.length ?? 0;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { _id: p._id, name: p.name, dueDate: p.dueDate, total, done, pct };
  });

  // Tasks not in "done" column
  const doneCols = new Set(
    projects.flatMap((p) =>
      (p.columns ?? []).filter((c) => c.id === "done").map((c) => `${p._id}:${c.id}`)
    )
  );
  const activeTasks = tasks.filter(
    (t) => !doneCols.has(`${t.projectId}:${t.columnId}`)
  );
  const tasksDueToday = activeTasks.filter((t) => t.dueDate === todayStr).length;
  const overdueTasks = activeTasks.filter(
    (t) => t.dueDate && t.dueDate < todayStr
  ).length;

  // Tasks by column across all projects
  const colCounts: Record<string, number> = {};
  for (const t of tasks) {
    colCounts[t.columnId] = (colCounts[t.columnId] ?? 0) + 1;
  }

  return {
    activeProjects: projects.length,
    projects: projectSummaries,
    tasksDueToday,
    overdueTasks,
    tasksByColumn: colCounts,
  };
}

// ── Upcoming Calendar Events ──────────────────────────────────────────────────

async function fetchUpcomingEvents() {
  const now = new Date().toISOString();
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { events } = await listEvents({ timeMin: now, timeMax: nextWeek, maxResults: 6 });
  return events.map((e) => ({
    id: e.id,
    summary: e.summary,
    start: e.start.dateTime ?? e.start.date ?? "",
    allDay: e.allDay,
    htmlLink: e.htmlLink,
  }));
}

// ── Pipeline Stats ────────────────────────────────────────────────────────────

async function fetchPipelineStats() {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [allContacts, wonContacts] = await Promise.all([
    sanityServer.fetch<{ stage: string; closedAt: string | null; stageEnteredAt: string; _createdAt: string }[]>(
      `*[_type == "pipelineContact"]{ stage, closedAt, stageEnteredAt, _createdAt }`
    ),
    sanityServer.fetch<{ closedAt: string; _createdAt: string }[]>(
      `*[_type == "pipelineContact" && stage == "won" && closedAt != null]{ closedAt, _createdAt }`
    ),
  ]);

  const totalLeadsThisMonth = allContacts.filter((c) => c._createdAt >= thisMonthStart).length;
  const wonThisMonth = wonContacts.filter((c) => c.closedAt >= thisMonthStart).length;
  const lostContacts = allContacts.filter((c) => c.stage === "lost").length;
  const closedTotal = wonContacts.length + lostContacts;
  const conversionRate = closedTotal > 0 ? Math.round((wonContacts.length / closedTotal) * 100) : null;

  // Average days to close
  const daysToClose = wonContacts.map((c) => {
    const created = new Date(c._createdAt).getTime();
    const closed = new Date(c.closedAt).getTime();
    return (closed - created) / 86400000;
  });
  const avgDaysToClose =
    daysToClose.length > 0
      ? Math.round(daysToClose.reduce((s, n) => s + n, 0) / daysToClose.length)
      : null;

  return {
    totalLeadsThisMonth,
    wonThisMonth,
    conversionRate,
    avgDaysToClose,
    totalActive: allContacts.filter((c) => c.stage !== "won" && c.stage !== "lost").length,
  };
}

// ── Estimate Stats ────────────────────────────────────────────────────────────

async function fetchEstimateStats() {
  const estimates = await sanityServer.fetch<Array<{
    status: string;
    total: number;
    approvedAt: string | null;
    _createdAt: string;
  }>>(`*[_type == "estimate"]{ status, total, approvedAt, _createdAt }`);

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const pending = estimates.filter(e => ["draft","sent","viewed"].includes(e.status));
  const approvedThisMonth = estimates.filter(e => e.status === "approved" && e.approvedAt && e.approvedAt >= thisMonthStart);
  const declined = estimates.filter(e => e.status === "declined");
  const closedTotal = approvedThisMonth.length + declined.filter(e => (e.approvedAt && e.approvedAt >= thisMonthStart) || e._createdAt >= thisMonthStart).length;
  void closedTotal;

  return {
    pendingCount: pending.length,
    pendingValue: pending.reduce((s, e) => s + (e.total || 0), 0),
    approvedThisMonthCount: approvedThisMonth.length,
    approvedThisMonthValue: approvedThisMonth.reduce((s, e) => s + (e.total || 0), 0),
  };
}

// ── Contract Stats ────────────────────────────────────────────────────────────

async function fetchContractStats() {
  const contracts = await sanityServer.fetch<Array<{
    status: string;
    signedAt: string | null;
    sentAt: string | null;
    _createdAt: string;
  }>>(`*[_type == "contract"]{ status, signedAt, sentAt, _createdAt }`);

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const staleSentThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const pending = contracts.filter((c) => ["sent", "viewed"].includes(c.status));
  const staleSent = pending.filter((c) => c.sentAt && c.sentAt < staleSentThreshold);
  const signedThisMonth = contracts.filter(
    (c) => c.status === "signed" && c.signedAt && c.signedAt >= thisMonthStart
  );

  return {
    pendingSignatureCount: pending.length,
    staleSentCount: staleSent.length,
    signedThisMonth: signedThisMonth.length,
    totalContracts: contracts.length,
    draftCount: contracts.filter((c) => c.status === "draft").length,
  };
}

// ── Onboarding Stats ─────────────────────────────────────────────────────────

async function fetchOnboardingStats() {
  const instances = await sanityServer.fetch<Array<{
    status: string;
    steps: Array<{ status: string; dueDate: string | null }> | null;
  }>>(`*[_type == "onboardingInstance"]{ status, steps }`);

  const today = new Date().toISOString().slice(0, 10);
  const active = instances.filter((i) => i.status === "active");

  const totalOverdueSteps = active.reduce((n, i) => {
    const steps = i.steps ?? [];
    return n + steps.filter((s) => s.dueDate && s.dueDate < today && s.status === "pending").length;
  }, 0);

  const stalled = active.filter((i) => {
    const steps = i.steps ?? [];
    return steps.some((s) => s.dueDate && s.dueDate < today && s.status === "pending");
  }).length;

  return {
    activeCount: active.length,
    completedCount: instances.filter((i) => i.status === "completed").length,
    overdueStepsCount: totalOverdueSteps,
    stalledCount: stalled,
  };
}

// ── Time Tracking Stats ───────────────────────────────────────────────────────

async function fetchTimeStats() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const [entries, activeTimer] = await Promise.all([
    sanityServer.fetch<Array<{
      durationSeconds: number;
      billable: boolean;
      hourlyRate: number;
      invoiceId: string | null;
    }>>(`*[_type == "timeEntry" && endTime != null && date >= $monthStart]{ durationSeconds, billable, hourlyRate, invoiceId }`, { monthStart }),
    sanityServer.fetch<{ _id: string } | null>(`*[_type == "timeEntry" && endTime == null][0]{ _id }`),
  ]);

  const totalSecondsThisMonth = entries.reduce((s, e) => s + (e.durationSeconds ?? 0), 0);
  const billableSecondsThisMonth = entries.filter((e) => e.billable).reduce((s, e) => s + (e.durationSeconds ?? 0), 0);
  const unbilledAmount = entries
    .filter((e) => e.billable && !e.invoiceId)
    .reduce((s, e) => s + (e.durationSeconds / 3600) * e.hourlyRate, 0);

  return {
    totalSecondsThisMonth,
    billableSecondsThisMonth,
    unbilledAmount,
    activeTimerRunning: !!activeTimer,
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── Existing data (unchanged) ──────────────────────────────────────────────
  const [projects, leads, bookings, recentLeads, recentBookings, monthlyLeads] = await Promise.all([
    sanityServer.fetch<number>(`count(*[_type == "project"])`),
    sanityServer.fetch<number>(`count(*[_type == "fitRequest"])`),
    sanityServer.fetch<number>(`count(*[_type == "assessmentBooking" && status == "CONFIRMED"])`),
    sanityServer.fetch<Array<{
      _id: string; name: string; company?: string; budget?: string;
      services?: string[]; createdAt: string;
    }>>(`*[_type == "fitRequest"] | order(createdAt desc)[0...10]{
      _id, name, company, budget, services, createdAt
    }`),
    sanityServer.fetch<Array<{
      _id: string; customerName: string; customerEmail: string;
      startsAtUtc: string; status: string;
    }>>(`*[_type == "assessmentBooking"] | order(_createdAt desc)[0...10]{
      _id, customerName, customerEmail, startsAtUtc, status
    }`),
    sanityServer.fetch<Array<{ month: string }>>(`
      *[_type == "fitRequest" && createdAt > $since] | order(createdAt asc) {
        "month": createdAt[0...7]
      }
    `, { since: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString() }),
  ]);

  const monthCounts: Record<string, number> = {};
  for (const l of monthlyLeads) {
    monthCounts[l.month] = (monthCounts[l.month] || 0) + 1;
  }
  const budgetBreakdown: Record<string, number> = {};
  for (const l of recentLeads) {
    if (l.budget) budgetBreakdown[l.budget] = (budgetBreakdown[l.budget] || 0) + 1;
  }

  // ── New data (each best-effort) ────────────────────────────────────────────
  const [revenue, projectHealth, upcomingEvents, pipelineStats, estimateStats, contractStats, onboardingStats, timeStats] = await Promise.all([
    fetchRevenue().catch((err) => { console.error("ANALYTICS_REVENUE_ERR:", err); return null; }),
    fetchProjectHealth().catch((err) => { console.error("ANALYTICS_PM_ERR:", err); return null; }),
    fetchUpcomingEvents().catch((err) => { console.error("ANALYTICS_CAL_ERR:", err); return null; }),
    fetchPipelineStats().catch((err) => { console.error("ANALYTICS_PIPELINE_ERR:", err); return null; }),
    fetchEstimateStats().catch((err) => { console.error("ANALYTICS_ESTIMATES_ERR:", err); return null; }),
    fetchContractStats().catch((err) => { console.error("ANALYTICS_CONTRACTS_ERR:", err); return null; }),
    fetchOnboardingStats().catch((err) => { console.error("ANALYTICS_ONBOARDING_ERR:", err); return null; }),
    fetchTimeStats().catch((err) => { console.error("ANALYTICS_TIME_ERR:", err); return null; }),
  ]);

  return NextResponse.json({
    // Existing
    totals: { projects, leads, bookings },
    recentLeads,
    recentBookings,
    monthlyLeads: Object.entries(monthCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count })),
    budgetBreakdown,
    // New
    revenue,
    projectHealth,
    upcomingEvents,
    pipelineStats,
    estimateStats,
    contractStats,
    onboardingStats,
    timeStats,
  });
}
