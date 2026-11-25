import type { LatLng } from "@/lib/riversiderally/types";

export type ReportType =
  | "police"
  | "accident"
  | "obstruction"
  | "debris"
  | "construction"
  | "road-closure"
  | "disabled-vehicle"
  | "hazard"
  | "other";

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  police: "Police / speed enforcement observed",
  accident: "Traffic accident",
  obstruction: "Road obstruction",
  debris: "Debris in roadway",
  construction: "Construction",
  "road-closure": "Road closure",
  "disabled-vehicle": "Disabled vehicle",
  hazard: "Hazardous road condition",
  other: "Other safety concern",
};

export type ReportStatus = "active" | "cleared" | "expired";

export interface RoadReport {
  id: string;
  reportType: ReportType;
  position: LatLng;
  roadLabel?: string;
  direction?: "northbound" | "southbound" | "eastbound" | "westbound" | "unspecified";
  description?: string;
  status: ReportStatus;
  confirmCount: number;
  dismissCount: number;
  createdAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp
  lastConfirmedAt?: string;
  scope: "local" | "shared";
}

export function freshnessLabel(report: RoadReport, now: Date = new Date()): string {
  const created = new Date(report.createdAt).getTime();
  const minutesAgo = Math.max(0, Math.round((now.getTime() - created) / 60000));
  const base = minutesAgo < 1 ? "Reported just now" : minutesAgo === 1 ? "Reported 1 minute ago" : `Reported ${minutesAgo} minutes ago`;

  if (report.lastConfirmedAt) {
    const confirmedMinutesAgo = Math.round((now.getTime() - new Date(report.lastConfirmedAt).getTime()) / 60000);
    if (confirmedMinutesAgo < 15) return `Recently confirmed (${base.toLowerCase()})`;
  }
  if (report.confirmCount === 0) return `Unverified report — ${base.toLowerCase()}`;
  return base;
}
