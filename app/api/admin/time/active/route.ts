import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";

export const runtime = "nodejs";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const active = await sanityServer.fetch(
      `*[_type == "timeEntry" && endTime == null][0]{
        _id, date, startTime, durationSeconds, description,
        projectId, projectName, clientName, billable, hourlyRate
      }`
    );
    return NextResponse.json(active ?? null);
  } catch (err) {
    console.error("TIME_ACTIVE_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch active timer" }, { status: 500 });
  }
}
