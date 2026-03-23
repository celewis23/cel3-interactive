export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { logAudit, AuditAction } from "@/lib/audit/log";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "expenses", "view");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const session = getSessionInfo(req);

    const expense = await sanityServer.fetch(
      `*[_type == "expense" && _id == $id][0]`,
      { id }
    );
    if (!expense) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Staff can only see their own
    if (session && !session.isOwner && session.staffId && expense.staffId !== session.staffId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(expense);
  } catch (err) {
    console.error("EXPENSE_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch expense" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "expenses", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const session = getSessionInfo(req);

    const existing = await sanityServer.fetch<{ staffId?: string } | null>(
      `*[_type == "expense" && _id == $id][0]{ staffId }`,
      { id }
    );
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (session && !session.isOwner && session.staffId && existing.staffId !== session.staffId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const patch = sanityWriteClient.patch(id);

    const fields: Record<string, unknown> = {};
    if (body.date !== undefined)          fields.date          = body.date;
    if (body.amountCents !== undefined)   fields.amountCents   = Math.round(body.amountCents);
    if (body.currency !== undefined)      fields.currency      = body.currency;
    if (body.vendor !== undefined)        fields.vendor        = body.vendor?.trim();
    if (body.categoryId !== undefined)    fields.categoryId    = body.categoryId;
    if (body.description !== undefined)   fields.description   = body.description?.trim() ?? null;
    if (body.paymentMethod !== undefined) fields.paymentMethod = body.paymentMethod;
    if (body.taxDeductible !== undefined) fields.taxDeductible = body.taxDeductible;
    if (body.clientName !== undefined)    fields.clientName    = body.clientName?.trim() ?? null;
    if (body.projectId !== undefined)     fields.projectId     = body.projectId ?? null;
    if (body.notes !== undefined)         fields.notes         = body.notes?.trim() ?? null;

    const updated = await patch.set(fields).commit();

    logAudit(req, {
      action: AuditAction.EXPENSE_UPDATED,
      resourceType: "expense",
      resourceId: id,
      description: `Expense updated`,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("EXPENSE_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "expenses", "delete");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const session = getSessionInfo(req);

    const existing = await sanityServer.fetch<{ staffId?: string; vendor?: string } | null>(
      `*[_type == "expense" && _id == $id][0]{ staffId, vendor }`,
      { id }
    );
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (session && !session.isOwner && session.staffId && existing.staffId !== session.staffId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await sanityWriteClient.delete(id);

    logAudit(req, {
      action: AuditAction.EXPENSE_DELETED,
      resourceType: "expense",
      resourceId: id,
      resourceLabel: existing.vendor,
      description: `Expense deleted: ${existing.vendor}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("EXPENSE_DELETE_ERR:", err);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
