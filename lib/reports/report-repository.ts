import type { ReportType, RoadReport } from "./report-schema";
import { computeExpiresAt, isExpired } from "./report-expiration";
import type { BoundingBox } from "@/lib/places/types";

const LOCAL_REPORTS_KEY = "riverside-rally:local-reports:v1";

function isBrowser() {
  return typeof window !== "undefined";
}

export interface CreateReportInput {
  reportType: ReportType;
  position: { lat: number; lon: number };
  roadLabel?: string;
  direction?: RoadReport["direction"];
  description?: string;
}

// ---- Local (device-only) repository ----

export function loadLocalReports(): RoadReport[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_REPORTS_KEY);
    if (!raw) return [];
    const reports = JSON.parse(raw) as RoadReport[];
    return reports.map((r) => (isExpired(r) ? { ...r, status: "expired" as const } : r));
  } catch {
    return [];
  }
}

function saveLocalReports(reports: RoadReport[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(reports));
}

export function createLocalReport(input: CreateReportInput): RoadReport {
  const now = new Date();
  const report: RoadReport = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    reportType: input.reportType,
    position: input.position,
    roadLabel: input.roadLabel,
    direction: input.direction,
    description: input.description,
    status: "active",
    confirmCount: 0,
    dismissCount: 0,
    createdAt: now.toISOString(),
    expiresAt: computeExpiresAt(input.reportType, now).toISOString(),
    scope: "local",
  };
  const reports = [...loadLocalReports(), report];
  saveLocalReports(reports);
  return report;
}

export function confirmLocalReport(id: string, stillThere: boolean): RoadReport[] {
  const reports = loadLocalReports().map((r) => {
    if (r.id !== id) return r;
    return {
      ...r,
      confirmCount: stillThere ? r.confirmCount + 1 : r.confirmCount,
      dismissCount: stillThere ? r.dismissCount : r.dismissCount + 1,
      lastConfirmedAt: stillThere ? new Date().toISOString() : r.lastConfirmedAt,
      status: !stillThere && r.dismissCount + 1 >= 2 ? ("cleared" as const) : r.status,
    };
  });
  saveLocalReports(reports);
  return reports;
}

export function removeExpiredLocalReports(): RoadReport[] {
  const reports = loadLocalReports().filter((r) => !isExpired(r) && r.status === "active");
  saveLocalReports(reports);
  return reports;
}

// ---- Shared repository (backed by /api/riversiderally/reports, which talks to Postgres) ----

export async function fetchSharedReports(bbox: BoundingBox): Promise<RoadReport[]> {
  const params = new URLSearchParams({
    south: String(bbox.south),
    west: String(bbox.west),
    north: String(bbox.north),
    east: String(bbox.east),
  });
  const res = await fetch(`/api/riversiderally/reports?${params.toString()}`);
  if (!res.ok) throw new Error(`Could not load shared reports (HTTP ${res.status}).`);
  const data = await res.json();
  return data.reports as RoadReport[];
}

export async function createSharedReport(input: CreateReportInput): Promise<RoadReport> {
  const res = await fetch("/api/riversiderally/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Could not submit report (HTTP ${res.status}).`);
  }
  const data = await res.json();
  return data.report as RoadReport;
}

export async function confirmSharedReport(id: string, stillThere: boolean): Promise<RoadReport> {
  const res = await fetch(`/api/riversiderally/reports/${id}/${stillThere ? "confirm" : "dismiss"}`, { method: "POST" });
  if (!res.ok) throw new Error(`Could not update report (HTTP ${res.status}).`);
  const data = await res.json();
  return data.report as RoadReport;
}
