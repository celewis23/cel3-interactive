import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";

export const runtime = "nodejs";

function startOf(unit: "week" | "month" | "year"): string {
  const d = new Date();
  if (unit === "week") {
    const day = d.getDay(); // 0=Sun
    d.setDate(d.getDate() - day);
  } else if (unit === "month") {
    d.setDate(1);
  } else {
    d.setMonth(0, 1);
  }
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "timeTracking", "view");
  if (authErr) return authErr;
  try {
    const entries = await sanityServer.fetch<Array<{
      date: string;
      durationSeconds: number;
      hourlyRate: number;
      billable: boolean;
      invoiceId: string | null;
      projectName: string | null;
      clientName: string | null;
    }>>(
      `*[_type == "timeEntry" && endTime != null]{
        date, durationSeconds, hourlyRate, billable, invoiceId, projectName, clientName
      }`
    );

    const weekStart = startOf("week");
    const monthStart = startOf("month");
    const yearStart = startOf("year");

    const inPeriod = (date: string, from: string) => date >= from;

    function summarize(subset: typeof entries) {
      const totalSeconds = subset.reduce((s, e) => s + (e.durationSeconds ?? 0), 0);
      const billableSeconds = subset.filter((e) => e.billable).reduce((s, e) => s + (e.durationSeconds ?? 0), 0);
      const billableAmount = subset
        .filter((e) => e.billable)
        .reduce((s, e) => s + (e.durationSeconds / 3600) * e.hourlyRate, 0);
      const unbilledSeconds = subset
        .filter((e) => e.billable && !e.invoiceId)
        .reduce((s, e) => s + (e.durationSeconds ?? 0), 0);
      const unbilledAmount = subset
        .filter((e) => e.billable && !e.invoiceId)
        .reduce((s, e) => s + (e.durationSeconds / 3600) * e.hourlyRate, 0);
      return { totalSeconds, billableSeconds, billableAmount, unbilledSeconds, unbilledAmount };
    }

    const weekEntries = entries.filter((e) => inPeriod(e.date, weekStart));
    const monthEntries = entries.filter((e) => inPeriod(e.date, monthStart));
    const yearEntries = entries.filter((e) => inPeriod(e.date, yearStart));

    // Top clients by hours (all time)
    const byClient: Record<string, number> = {};
    for (const e of entries) {
      if (!e.clientName) continue;
      byClient[e.clientName] = (byClient[e.clientName] ?? 0) + (e.durationSeconds ?? 0);
    }
    const topClients = Object.entries(byClient)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, seconds]) => ({ name, seconds }));

    // Top projects by hours (all time)
    const byProject: Record<string, number> = {};
    for (const e of entries) {
      if (!e.projectName) continue;
      byProject[e.projectName] = (byProject[e.projectName] ?? 0) + (e.durationSeconds ?? 0);
    }
    const topProjects = Object.entries(byProject)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, seconds]) => ({ name, seconds }));

    // Unbilled per client
    const unbilledByClient: Record<string, { seconds: number; amount: number }> = {};
    for (const e of entries.filter((e) => e.billable && !e.invoiceId)) {
      const key = e.clientName || "Unassigned";
      if (!unbilledByClient[key]) unbilledByClient[key] = { seconds: 0, amount: 0 };
      unbilledByClient[key].seconds += e.durationSeconds ?? 0;
      unbilledByClient[key].amount += (e.durationSeconds / 3600) * e.hourlyRate;
    }

    return NextResponse.json({
      week: summarize(weekEntries),
      month: summarize(monthEntries),
      year: summarize(yearEntries),
      topClients,
      topProjects,
      unbilledByClient,
    });
  } catch (err) {
    console.error("TIME_REPORT_ERR:", err);
    return NextResponse.json({ error: "Failed to generate time report" }, { status: 500 });
  }
}
