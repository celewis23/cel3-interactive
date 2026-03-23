export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { logAudit, AuditAction } from "@/lib/audit/log";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "expenses", "view");
  if (authErr) return authErr;

  try {
    const session = getSessionInfo(req);
    const { searchParams } = new URL(req.url);

    const from       = searchParams.get("from");
    const to         = searchParams.get("to");
    const categoryId = searchParams.get("categoryId");
    const method     = searchParams.get("paymentMethod");
    const taxOnly    = searchParams.get("taxDeductible");
    const clientName = searchParams.get("clientName");
    const projectId  = searchParams.get("projectId");
    const limit      = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset     = parseInt(searchParams.get("offset") ?? "0", 10);

    const filters: string[] = [`_type == "expense"`];

    // Staff see only their own expenses
    if (session && !session.isOwner && session.staffId) {
      filters.push(`staffId == "${session.staffId}"`);
    }

    if (from)       filters.push(`date >= "${from}"`);
    if (to)         filters.push(`date <= "${to}"`);
    if (categoryId) filters.push(`categoryId == "${categoryId}"`);
    if (method)     filters.push(`paymentMethod == "${method}"`);
    if (taxOnly === "true") filters.push(`taxDeductible == true`);
    if (clientName) filters.push(`clientName == "${clientName}"`);
    if (projectId)  filters.push(`projectId == "${projectId}"`);

    const where = filters.join(" && ");

    const [expenses, total, sumCents] = await Promise.all([
      sanityServer.fetch(
        `*[${where}] | order(date desc, _createdAt desc) [${offset}...${offset + limit}] {
          _id, date, amountCents, currency, vendor, categoryId, description,
          paymentMethod, taxDeductible, clientName, projectId,
          receipts, recurringId, staffId, notes, _createdAt
        }`
      ),
      sanityServer.fetch<number>(`count(*[${where}])`),
      sanityServer.fetch<{ total: number }[]>(
        `[{ "total": math::sum(*[${where}].amountCents) }]`
      ),
    ]);

    return NextResponse.json({
      expenses,
      total,
      totalCents: sumCents[0]?.total ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    console.error("EXPENSES_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "expenses", "edit");
  if (authErr) return authErr;

  try {
    const session = getSessionInfo(req);
    const body = await req.json() as {
      date: string;
      amountCents: number;
      currency?: string;
      vendor: string;
      categoryId?: string;
      description?: string;
      paymentMethod?: string;
      taxDeductible?: boolean;
      clientName?: string;
      projectId?: string;
      recurringId?: string;
      notes?: string;
    };

    if (!body.date) return NextResponse.json({ error: "date required" }, { status: 400 });
    if (!body.amountCents || body.amountCents <= 0) return NextResponse.json({ error: "amount required" }, { status: 400 });
    if (!body.vendor?.trim()) return NextResponse.json({ error: "vendor required" }, { status: 400 });

    const expense = await sanityWriteClient.create({
      _type: "expense",
      date: body.date,
      amountCents: Math.round(body.amountCents),
      currency: body.currency ?? "USD",
      vendor: body.vendor.trim(),
      categoryId: body.categoryId ?? null,
      description: body.description?.trim() ?? null,
      paymentMethod: body.paymentMethod ?? "card",
      taxDeductible: body.taxDeductible ?? false,
      clientName: body.clientName?.trim() ?? null,
      projectId: body.projectId ?? null,
      receipts: [],
      recurringId: body.recurringId ?? null,
      staffId: session?.staffId ?? null,
      notes: body.notes?.trim() ?? null,
    });

    logAudit(req, {
      action: AuditAction.EXPENSE_CREATED,
      resourceType: "expense",
      resourceId: expense._id,
      resourceLabel: body.vendor,
      description: `Expense logged: ${body.vendor} — $${(body.amountCents / 100).toFixed(2)}`,
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (err) {
    console.error("EXPENSES_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
