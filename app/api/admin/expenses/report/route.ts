export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { DateTime } from "luxon";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "expenses", "view");
  if (authErr) return authErr;
  const session = getSessionInfo(req);
  if (!session || (!session.isOwner && !session.staffId)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const now = DateTime.now().setZone("America/New_York");
    const { year, month } = now;
    const quarter = Math.floor((month - 1) / 3) + 1;
    const qStart = `${year}-${String((quarter - 1) * 3 + 1).padStart(2, "0")}-01`;
    const mStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const yStart = `${year}-01-01`;
    const today = now.toISODate()!;
    const expenses = await sanityServer.fetch<{ date: string; categoryId: string | null; amountCents: number }[]>(
      `*[_type == "expense" && date >= $yStart && date <= $today${session.isOwner ? "" : " && staffId == $staffId"}]{date, categoryId, amountCents}`,
      { yStart, today, staffId: session.staffId ?? null },
    );
    let monthTotalCents = 0, quarterTotalCents = 0, yearTotalCents = 0;
    const categories = new Map<string, { categoryId: string; totalCents: number; count: number }>();
    for (const expense of expenses) {
      if (!Number.isSafeInteger(expense.amountCents)) throw new Error("Expense has an invalid amount");
      yearTotalCents += expense.amountCents;
      if (expense.date >= qStart) quarterTotalCents += expense.amountCents;
      if (expense.date >= mStart) monthTotalCents += expense.amountCents;
      const categoryId = expense.categoryId || "uncategorized";
      const category = categories.get(categoryId) ?? { categoryId, totalCents: 0, count: 0 };
      category.totalCents += expense.amountCents;
      category.count++;
      categories.set(categoryId, category);
    }
    return NextResponse.json({ monthTotalCents, quarterTotalCents, yearTotalCents,
      period: { year, month, quarter, mStart, qStart, yStart }, categoryBreakdown: [...categories.values()] });
  } catch (err) {
    console.error("EXPENSE_REPORT_ERR:", err);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
