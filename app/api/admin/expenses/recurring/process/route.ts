export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { logAudit, AuditAction } from "@/lib/audit/log";

function advanceDate(dateStr: string, frequency: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  switch (frequency) {
    case "weekly":    d.setUTCDate(d.getUTCDate() + 7);   break;
    case "monthly":   d.setUTCMonth(d.getUTCMonth() + 1); break;
    case "quarterly": d.setUTCMonth(d.getUTCMonth() + 3); break;
    case "annually":  d.setUTCFullYear(d.getUTCFullYear() + 1); break;
  }
  return d.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "expenses", "edit");
  if (authErr) return authErr;

  try {
    const today = new Date().toISOString().slice(0, 10);

    const due = await sanityServer.fetch<{
      _id: string; name: string; amountCents: number; currency: string;
      vendor: string; categoryId: string; description: string;
      paymentMethod: string; taxDeductible: boolean;
      clientName: string; projectId: string;
      frequency: string; nextDueDate: string; staffId: string;
    }[]>(
      `*[_type == "expenseRecurring" && active == true && nextDueDate <= $today]`,
      { today }
    );

    if (due.length === 0) return NextResponse.json({ generated: 0 });

    const created: string[] = [];

    for (const rec of due) {
      const expense = await sanityWriteClient.create({
        _type: "expense",
        date: rec.nextDueDate,
        amountCents: rec.amountCents,
        currency: rec.currency ?? "USD",
        vendor: rec.vendor,
        categoryId: rec.categoryId ?? null,
        description: rec.description ?? null,
        paymentMethod: rec.paymentMethod ?? "card",
        taxDeductible: rec.taxDeductible ?? false,
        clientName: rec.clientName ?? null,
        projectId: rec.projectId ?? null,
        receipts: [],
        recurringId: rec._id,
        staffId: rec.staffId ?? null,
        notes: `Auto-generated from recurring: ${rec.name}`,
      });

      created.push(expense._id);

      // Advance next due date
      await sanityWriteClient.patch(rec._id).set({
        nextDueDate: advanceDate(rec.nextDueDate, rec.frequency),
      }).commit();

      logAudit(req, {
        action: AuditAction.EXPENSE_CREATED,
        resourceType: "expense",
        resourceId: expense._id,
        resourceLabel: rec.vendor,
        description: `Recurring expense generated: ${rec.vendor}`,
        metadata: { recurringId: rec._id },
      });
    }

    return NextResponse.json({ generated: created.length, ids: created });
  } catch (err) {
    console.error("RECURRING_PROCESS_ERR:", err);
    return NextResponse.json({ error: "Failed to process recurring" }, { status: 500 });
  }
}
