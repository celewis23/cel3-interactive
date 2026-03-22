import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { listThreads } from "@/lib/gmail/api";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requirePermission(req, "leads", "view");
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const contact = await sanityServer.fetch<{ email: string | null } | null>(
      `*[_type == "pipelineContact" && _id == $id][0]{ email }`,
      { id }
    );
    if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!contact.email) return NextResponse.json({ threads: [] });

    try {
      const result = await listThreads({ q: contact.email, maxResults: 10 });
      return NextResponse.json({ threads: result.threads });
    } catch {
      return NextResponse.json({ threads: [], error: "Gmail not connected" });
    }
  } catch (err) {
    console.error("PIPELINE_EMAILS_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 });
  }
}
