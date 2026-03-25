export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "automations", "view");
  if (authErr) return authErr;

  try {
    const { searchParams } = new URL(req.url);
    const automationId = searchParams.get("automationId");
    const status       = searchParams.get("status");
    const limit        = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset       = parseInt(searchParams.get("offset") ?? "0", 10);
    const withSteps    = searchParams.get("withSteps") === "true";

    const filters: string[] = [`_type == "automationRun"`];
    if (automationId) filters.push(`automationId == "${automationId}"`);
    if (status)       filters.push(`status == "${status}"`);

    const where = filters.join(" && ");

    const stepsFragment = withSteps
      ? `, "steps": *[_type == "automationRunStep" && runId == ^._id] | order(_createdAt asc) { _id, nodeId, nodeType, nodeLabel, status, inputData, outputData, error, executeAt, executedAt }`
      : "";

    const [runs, total] = await Promise.all([
      sanityServer.fetch(
        `*[${where}] | order(startedAt desc) [${offset}...${offset + limit}] {
          _id, automationId, automationName, triggeredByEntityType, triggeredByEntityId,
          triggeredByClientId, status, branchPath, error, isDryRun, startedAt, completedAt
          ${stepsFragment}
        }`
      ),
      sanityServer.fetch<number>(`count(*[${where}])`),
    ]);

    return NextResponse.json({ runs, total, limit, offset });
  } catch (err) {
    console.error("AUTOMATION_RUNS_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch runs" }, { status: 500 });
  }
}
