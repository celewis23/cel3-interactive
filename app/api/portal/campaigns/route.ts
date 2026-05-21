import { NextRequest, NextResponse } from "next/server";
import { verifyPortalSessionToken, PORTAL_COOKIE } from "@/lib/portal/auth";
import { getRecentSentCampaigns } from "@/lib/campaigns/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(PORTAL_COOKIE)?.value;
  if (!token || !verifyPortalSessionToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const campaigns = await getRecentSentCampaigns(5);
    return NextResponse.json({ campaigns });
  } catch (err) {
    console.error("PORTAL_CAMPAIGNS_GET_ERR:", err);
    return NextResponse.json({ campaigns: [] });
  }
}
