export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "expenses", "view");
  if (authErr) return authErr;

  try {
    const session = getSessionInfo(req);
    const now   = new Date();
    const year  = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const quarter = Math.floor((month - 1) / 3) + 1;
    const qStart  = `${year}-${String((quarter - 1) * 3 + 1).padStart(2, "0")}-01`;
    const mStart  = `${year}-${String(month).padStart(2, "0")}-01`;
    const yStart  = `${year}-01-01`;

    const staffFilter = session && !session.isOwner && session.staffId
      ? ` && staffId == "${session.staffId}"`
      : "";

    const base = `_type == "expense"${staffFilter}`;

    const [monthTotal, quarterTotal, yearTotal, byCat] = await Promise.all([
      sanityServer.fetch<{ total: number }[]>(
        `[{ "total": math::sum(*[${base} && date >= $mStart].amountCents) }]`,
        { mStart }
      ),
      sanityServer.fetch<{ total: number }[]>(
        `[{ "total": math::sum(*[${base} && date >= $qStart].amountCents) }]`,
        { qStart }
      ),
      sanityServer.fetch<{ total: number }[]>(
        `[{ "total": math::sum(*[${base} && date >= $yStart].amountCents) }]`,
        { yStart }
      ),
      sanityServer.fetch<{ categoryId: string; total: number }[]>(
        `*[${base} && date >= $yStart] {
          "categoryId": coalesce(categoryId, "uncategorized")
        } | { categoryId, "total": count(*) }`,
        { yStart }
      ).catch(() => [] as { categoryId: string; total: number }[]),
    ]);

    // Get category breakdown with sums via GROQ aggregation workaround
    const categoryBreakdown = await sanityServer.fetch<{ categoryId: string; totalCents: number; count: number }[]>(
      `array::unique(*[${base} && date >= $yStart].categoryId) {
        "categoryId": @,
        "totalCents": math::sum(*[_type == "expense"${staffFilter} && date >= $yStart && categoryId == ^].amountCents),
        "count": count(*[_type == "expense"${staffFilter} && date >= $yStart && categoryId == ^])
      }`,
      { yStart }
    ).catch(() => []);

    return NextResponse.json({
      monthTotalCents:   monthTotal[0]?.total   ?? 0,
      quarterTotalCents: quarterTotal[0]?.total ?? 0,
      yearTotalCents:    yearTotal[0]?.total    ?? 0,
      period: { year, month, quarter, mStart, qStart, yStart },
      categoryBreakdown,
    });
  } catch (err) {
    console.error("EXPENSE_REPORT_ERR:", err);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
