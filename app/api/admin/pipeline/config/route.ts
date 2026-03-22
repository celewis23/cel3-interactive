import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export const runtime = "nodejs";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

const DEFAULT_STAGES = [
  { id: "new-lead", name: "New Lead" },
  { id: "contacted", name: "Contacted" },
  { id: "proposal", name: "Proposal Sent" },
  { id: "negotiating", name: "Negotiating" },
  { id: "won", name: "Won" },
  { id: "lost", name: "Lost" },
];

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const config = await sanityServer.fetch<{ stages: { id: string; name: string }[] } | null>(
      `*[_type == "pipelineConfig" && _id == "pipeline-config"][0]{ stages }`
    );
    return NextResponse.json({ stages: config?.stages ?? DEFAULT_STAGES });
  } catch (err) {
    console.error("PIPELINE_CONFIG_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (!Array.isArray(body.stages)) {
      return NextResponse.json({ error: "stages must be an array" }, { status: 400 });
    }
    const result = await sanityWriteClient.createOrReplace({
      _id: "pipeline-config",
      _type: "pipelineConfig",
      stages: body.stages,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("PIPELINE_CONFIG_PUT_ERR:", err);
    return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
  }
}
