import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { computeExpiresAt } from "@/lib/reports/report-expiration";
import type { ReportType, RoadReport } from "@/lib/reports/report-schema";

const VALID_TYPES: ReportType[] = [
  "police",
  "accident",
  "obstruction",
  "debris",
  "construction",
  "road-closure",
  "disabled-vehicle",
  "hazard",
  "other",
];

const VALID_DIRECTIONS = ["northbound", "southbound", "eastbound", "westbound", "unspecified"];

interface ReportRow {
  id: string;
  report_type: ReportType;
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

function requesterHash(req: NextRequest): string {
  const address = (req.headers.get("x-vercel-forwarded-for") || req.headers.get("x-forwarded-for") || "unknown")
    .split(",")[0]
    .trim()
    .slice(0, 100);
  return createHash("sha256").update(`riversiderally-reports:${address}`).digest("hex");
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const south = parseFloat(params.get("south") ?? "");
  const west = parseFloat(params.get("west") ?? "");
  const north = parseFloat(params.get("north") ?? "");
  const east = parseFloat(params.get("east") ?? "");

  if ([south, west, north, east].some((n) => Number.isNaN(n))) {
    return NextResponse.json({ error: "south, west, north, east query params are required numbers." }, { status: 400 });
  }

  await sql.query(`UPDATE riversiderally_reports SET status = 'expired' WHERE status = 'active' AND expires_at <= now()`);

  const rows = await sql.query<ReportRow>(
    `SELECT * FROM riversiderally_reports
       WHERE status = 'active' AND lat BETWEEN $1 AND $2 AND lon BETWEEN $3 AND $4
       ORDER BY created_at DESC LIMIT 200`,
    [south, north, west, east],
  );

  return NextResponse.json({ reports: rows.map(rowToReport) });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { reportType, position, roadLabel, direction, description } = body as {
    reportType?: string;
    position?: { lat?: number; lon?: number };
    roadLabel?: string;
    direction?: string;
    description?: string;
  };

  if (!reportType || !VALID_TYPES.includes(reportType as ReportType)) {
    return NextResponse.json({ error: "Invalid report type." }, { status: 400 });
  }
  if (!position || typeof position.lat !== "number" || typeof position.lon !== "number") {
    return NextResponse.json({ error: "A map position is required." }, { status: 400 });
  }
  if (direction && !VALID_DIRECTIONS.includes(direction)) {
    return NextResponse.json({ error: "Invalid direction." }, { status: 400 });
  }
  if (description && description.length > 280) {
    return NextResponse.json({ error: "Description is too long (280 characters max)." }, { status: 400 });
  }

  const reporterHash = requesterHash(req);

  // Rate limit: at most 5 reports per 15 minutes per requester.
  const recent = await sql.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM riversiderally_reports
       WHERE reporter_hash = $1 AND created_at > now() - interval '15 minutes'`,
    [reporterHash],
  );
  if (Number(recent[0]?.count ?? 0) >= 5) {
    return NextResponse.json({ error: "Too many reports submitted recently. Please wait before submitting another." }, { status: 429 });
  }

  const id = `rr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date();
  const expiresAt = computeExpiresAt(reportType as ReportType, now);

  const rows = await sql.query<ReportRow>(
    `INSERT INTO riversiderally_reports
       (id, report_type, lat, lon, road_label, direction, description, status, confirm_count, dismiss_count, reporter_hash, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', 0, 0, $8, $9, $10)
     RETURNING *`,
    [id, reportType, position.lat, position.lon, roadLabel ?? null, direction ?? "unspecified", description ?? null, reporterHash, now.toISOString(), expiresAt.toISOString()],
  );

  return NextResponse.json({ report: rowToReport(rows[0]) }, { status: 201 });
}
