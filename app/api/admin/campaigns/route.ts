import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { listCampaigns, createCampaign } from "@/lib/campaigns/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "settings", "view");
  if (authErr) return authErr;
  try {
    const campaigns = await listCampaigns();
    return NextResponse.json({ campaigns });
  } catch (err) {
    console.error("ADMIN_CAMPAIGNS_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to load campaigns" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "settings", "edit");
  if (authErr) return authErr;
  try {
    const session = getSessionInfo(req);
    const body = await req.json();
    const { title, subject } = body;
    if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    if (!subject?.trim()) return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    const campaign = await createCampaign({
      title: title.trim(),
      subject: subject.trim(),
      bodyHtml: body.bodyHtml ?? "",
      targetType: body.targetType ?? "all",
      groupId: body.groupId ?? null,
      scheduledAt: body.scheduledAt ?? null,
      createdByAdminId: session?.staffId ?? "owner",
    });
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err) {
    console.error("ADMIN_CAMPAIGNS_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
