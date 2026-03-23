export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityWriteClient } from "@/lib/sanity.write";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "expenses", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await req.json();
    const patch = sanityWriteClient.patch(id);
    const fields: Record<string, unknown> = {};

    if (body.name !== undefined)          fields.name          = body.name?.trim();
    if (body.amountCents !== undefined)   fields.amountCents   = Math.round(body.amountCents);
    if (body.currency !== undefined)      fields.currency      = body.currency;
    if (body.vendor !== undefined)        fields.vendor        = body.vendor?.trim();
    if (body.categoryId !== undefined)    fields.categoryId    = body.categoryId;
    if (body.description !== undefined)   fields.description   = body.description?.trim() ?? null;
    if (body.paymentMethod !== undefined) fields.paymentMethod = body.paymentMethod;
    if (body.taxDeductible !== undefined) fields.taxDeductible = body.taxDeductible;
    if (body.clientName !== undefined)    fields.clientName    = body.clientName?.trim() ?? null;
    if (body.projectId !== undefined)     fields.projectId     = body.projectId ?? null;
    if (body.frequency !== undefined)     fields.frequency     = body.frequency;
    if (body.nextDueDate !== undefined)   fields.nextDueDate   = body.nextDueDate;
    if (body.active !== undefined)        fields.active        = body.active;

    const updated = await patch.set(fields).commit();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("RECURRING_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update recurring" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "expenses", "delete");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    await sanityWriteClient.delete(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("RECURRING_DELETE_ERR:", err);
    return NextResponse.json({ error: "Failed to delete recurring" }, { status: 500 });
  }
}
