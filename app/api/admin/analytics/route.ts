import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";

export const runtime = "nodejs";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const session = verifySessionToken(token);
  return session?.step === "full";
}

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [projects, leads, bookings, recentLeads, recentBookings, monthlyLeads] = await Promise.all([
    // Total case studies
    sanityServer.fetch<number>(`count(*[_type == "project"])`),
    // Total leads
    sanityServer.fetch<number>(`count(*[_type == "fitRequest"])`),
    // Total bookings (confirmed)
    sanityServer.fetch<number>(`count(*[_type == "assessmentBooking" && status == "CONFIRMED"])`),
    // Recent leads (last 10)
    sanityServer.fetch<Array<{
      _id: string;
      name: string;
      email: string;
      company?: string;
      budget?: string;
      services?: string[];
      createdAt: string;
    }>>(`*[_type == "fitRequest"] | order(createdAt desc)[0...10]{
      _id, name, email, company, budget, services, createdAt
    }`),
    // Recent bookings (last 10)
    sanityServer.fetch<Array<{
      _id: string;
      customerName: string;
      customerEmail: string;
      startsAtUtc: string;
      status: string;
    }>>(`*[_type == "assessmentBooking"] | order(_createdAt desc)[0...10]{
      _id, customerName, customerEmail, startsAtUtc, status
    }`),
    // Leads per month (last 6 months)
    sanityServer.fetch<Array<{ month: string; count: number }>>(`
      *[_type == "fitRequest" && createdAt > $since] | order(createdAt asc) {
        "month": createdAt[0...7]
      }
    `, { since: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString() }),
  ]);

  // Aggregate monthly leads
  const monthCounts: Record<string, number> = {};
  for (const l of monthlyLeads as Array<{ month: string }>) {
    monthCounts[l.month] = (monthCounts[l.month] || 0) + 1;
  }

  // Budget breakdown from leads
  const budgetBreakdown: Record<string, number> = {};
  for (const l of recentLeads) {
    if (l.budget) budgetBreakdown[l.budget] = (budgetBreakdown[l.budget] || 0) + 1;
  }

  return NextResponse.json({
    totals: { projects, leads, bookings },
    recentLeads,
    recentBookings,
    monthlyLeads: Object.entries(monthCounts).sort((a, b) => a[0].localeCompare(b[0])).map(([month, count]) => ({ month, count })),
    budgetBreakdown,
  });
}
