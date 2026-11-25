import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { shouldAutoClean } from "@/lib/reports/report-expiration";
import type { RoadReport } from "@/lib/reports/report-schema";

type Params = { params: Promise<{ id: string }> };

interface ReportRow {
  id: string;
  report_type: RoadReport["reportType"];
  lat: number;
  lon: number;
  road_label: string | null;
  direction: RoadReport["direction"] | null;
  description: string | null;
  status: RoadReport["status"];
  confirm_count: number;
  dismiss_count: number;
  created_at: string;
  expires_at: string;
  last_confirmed_at: string | null;
}

function rowToReport(row: ReportRow): RoadReport {
  return {
    id: row.id,
    reportType: row.report_type,
    position: { lat: row.lat, lon: row.lon },
    roadLabel: row.road_label ?? undefined,
    direction: row.direction ?? undefined,
    description: row.description ?? undefined,
    status: row.status,
    confirmCount: row.confirm_count,
    dismissCount: row.dismiss_count,
    createdAt: new Date(row.created_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
    lastConfirmedAt: row.last_confirmed_at ? new Date(row.last_confirmed_at).toISOString() : undefined,
    scope: "shared",
  };
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const rows = await sql.query<ReportRow>(
    `UPDATE riversiderally_reports SET dismiss_count = dismiss_count + 1
       WHERE id = $1 AND status = 'active'
       RETURNING *`,
    [id],
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Report not found or no longer active." }, { status: 404 });
  }

  let report = rows[0];
  if (shouldAutoClean(report.confirm_count, report.dismiss_count)) {
    const cleared = await sql.query<ReportRow>(`UPDATE riversiderally_reports SET status = 'cleared' WHERE id = $1 RETURNING *`, [id]);
    report = cleared[0];
  }

  return NextResponse.json({ report: rowToReport(report) });
}
