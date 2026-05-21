import { NextRequest, NextResponse } from "next/server";
import { getDueCampaigns } from "@/lib/campaigns/db";
import { sendCampaign } from "@/lib/campaigns/sender";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const due = await getDueCampaigns();
    const results = await Promise.allSettled(due.map((c) => sendCampaign(c.id)));
    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    return NextResponse.json({ processed: due.length, sent, failed });
  } catch (err) {
    console.error("CRON_CAMPAIGNS_ERR:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
