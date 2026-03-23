export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityWriteClient } from "@/lib/sanity.write";
import { logAudit, AuditAction } from "@/lib/audit/log";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "expenses", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const { name, color, taxRelevant } = await req.json() as { name?: string; color?: string; taxRelevant?: boolean };

    const patch = sanityWriteClient.patch(id);
    if (name?.trim()) patch.set({ name: name.trim() });
    if (color) patch.set({ color });
    if (taxRelevant !== undefined) patch.set({ taxRelevant });

    const updated = await patch.commit();

    logAudit(req, {
      action: AuditAction.EXPENSE_CATEGORY_UPDATED,
      resourceType: "expenseCategory",
      resourceId: id,
      description: `Updated expense category`,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("EXPENSE_CAT_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const authErr = await requirePermission(req, "expenses", "delete");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    await sanityWriteClient.delete(id);

    logAudit(req, {
      action: AuditAction.EXPENSE_CATEGORY_DELETED,
      resourceType: "expenseCategory",
      resourceId: id,
      description: `Deleted expense category`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("EXPENSE_CAT_DELETE_ERR:", err);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
