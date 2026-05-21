import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { getCampaignById, updateCampaign, deleteCampaign } from "@/lib/campaigns/db";
import { sendCampaign } from "@/lib/campaigns/sender";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "settings", "view");
  if (authErr) return authErr;
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ campaign });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "settings", "edit");
  if (authErr) return authErr;
  try {
    const { id } = await params;
    const campaign = await getCampaignById(id);
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (campaign.status === "sent") {
      return NextResponse.json({ error: "Cannot edit a sent campaign" }, { status: 400 });
    }
    const body = await req.json();

    // action: "send" — trigger send immediately
    if (body.action === "send") {
      const result = await sendCampaign(id);
      const updated = await getCampaignById(id);
      return NextResponse.json({ campaign: updated, ...result });
    }

    const updated = await updateCampaign(id, {
      title: body.title,
      subject: body.subject,
      bodyHtml: body.bodyHtml,
      targetType: body.targetType,
      groupId: body.groupId,
      scheduledAt: body.scheduledAt,
    });
    return NextResponse.json({ campaign: updated });
  } catch (err) {
    console.error("ADMIN_CAMPAIGN_PATCH_ERR:", err);
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requirePermission(req, "settings", "edit");
  if (authErr) return authErr;
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (campaign.status === "sending") {
    return NextResponse.json({ error: "Cannot delete a campaign while it is sending" }, { status: 400 });
  }
  await deleteCampaign(id);
  return NextResponse.json({ ok: true });
}
