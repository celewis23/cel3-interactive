import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityWriteClient } from "@/lib/sanity.write";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "clients", "edit");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await req.json();
    const now = new Date().toISOString();

    let mutation = sanityWriteClient.patch(id).set({ updatedAt: now });

    if ("status" in body) {
      mutation = mutation.set({ status: body.status ?? "submitted" });
    }

    if ("noteText" in body && typeof body.noteText === "string" && body.noteText.trim()) {
      const note = { _key: uuidv4(), text: body.noteText.trim(), createdAt: now };
      mutation = mutation
        .setIfMissing({ ticketNotes: [] })
        .insert("after", "ticketNotes[-1]", [note]);
    }

    const updated = await mutation.commit();
    return NextResponse.json(updated);
  } catch (err) {
    console.error("ADMIN_PORTAL_REQUEST_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}
