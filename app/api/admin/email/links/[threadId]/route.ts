// DELETE /api/admin/email/links/[threadId] — remove a link
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityWriteClient } from "@/lib/sanity.write";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const authErr = await requirePermission(req, "email", "edit");
  if (authErr) return authErr;
  try {
    const { threadId } = await params;
    await sanityWriteClient.delete(`gmailLink_${threadId}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("EMAIL_ERROR:", err);
    return NextResponse.json(
      { error: "Failed to delete link" },
      { status: 500 }
    );
  }
}
