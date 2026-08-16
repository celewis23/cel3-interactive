import { NextRequest, NextResponse } from "next/server";
import { extGuard } from "@/lib/integrations/extMiddleware";
import { handlePreflight } from "@/lib/integrations/cors";
import { sanityServer } from "@/lib/sanityServer";

export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  return handlePreflight(req, ["*"]);
}

export async function GET(req: NextRequest) {
  const ctx = await extGuard(req, "site:status:read");
  if (ctx instanceof NextResponse) return ctx;
  const { actor, corsHeaders } = ctx;

  try {
    const pipelineContactId = actor.kind === "client" ? actor.pipelineContactId : null;
    if (!pipelineContactId) {
      return NextResponse.json(
        { status: "active", maintenanceMode: false, adminLoginBlocked: false, reason: null, suspendedAt: null },
        { headers: corsHeaders }
      );
    }

    const contact = await sanityServer.fetch<{
      websiteStatus?: string;
      websiteStatusReason?: string | null;
      websiteSuspendedAt?: string | null;
    } | null>(
      `*[_type == "pipelineContact" && _id == $id][0]{ websiteStatus, websiteStatusReason, websiteSuspendedAt }`,
      { id: pipelineContactId }
    );

    const suspended = contact?.websiteStatus === "suspended";
    return NextResponse.json(
      {
        status: suspended ? "suspended" : "active",
        maintenanceMode: suspended,
        adminLoginBlocked: suspended,
        reason: suspended ? contact?.websiteStatusReason ?? null : null,
        suspendedAt: suspended ? contact?.websiteSuspendedAt ?? null : null,
      },
      { headers: { ...corsHeaders, "Cache-Control": "private, max-age=60" } }
    );
  } catch (err) {
    console.error("EXT_SITE_STATUS_ERR:", err);
    return NextResponse.json(
      { status: "active", maintenanceMode: false, adminLoginBlocked: false, reason: null, suspendedAt: null },
      { headers: corsHeaders }
    );
  }
}
