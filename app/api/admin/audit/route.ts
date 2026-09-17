import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { buildActivityQuery, csvCell } from "@/lib/audit/query";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "auditLog", "view");
  if (authErr) return authErr;
  const search = new URL(req.url).searchParams;
  const { where, params, offset, limit } = buildActivityQuery(search);
  const projection = `_id, timestamp, userId, userName, userEmail, isOwner, action,
    resourceType, resourceId, resourceLabel, description, ipAddress, before, after, metadata,
    "status": coalesce(status, "recorded"), "source": coalesce(source, select(userName in ["System", "Billing enforcement"] => "automatic", "manual")),
    kind, runId, durationMs, routine`;
  try {
    if (search.get("format") === "csv") {
      const events = await sanityServer.fetch<Array<Record<string, unknown>>>(
        `*[${where}] | order(timestamp desc, _id desc) [0...5000]{${projection}}`, params,
      );
      const keys = ["timestamp", "userName", "userEmail", "source", "status", "action", "resourceType", "resourceId", "resourceLabel", "description", "durationMs", "runId"];
      const csv = [keys.map(csvCell).join(","), ...events.map((event) => keys.map((key) => csvCell(event[key])).join(","))].join("\r\n");
      return new NextResponse(csv, { headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="activity-log-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      } });
    }
    const [events, total] = await Promise.all([
      sanityServer.fetch(`*[${where}] | order(timestamp desc, _id desc) [${offset}...${offset + limit}]{${projection}}`, params),
      sanityServer.fetch<number>(`count(*[${where}])`, params),
    ]);
    return NextResponse.json({ events, total, offset, limit }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("AUDIT_GET_ERR:", err);
    return NextResponse.json({ error: "Activity history could not be loaded. Try refreshing." }, { status: 500 });
  }
}
