import type { ReportType, RoadReport } from "./report-schema";

// Configurable initial defaults, not guarantees of accuracy — see the brief.
export const DEFAULT_EXPIRATION_MINUTES: Record<ReportType, number> = {
  police: 45,
  accident: 90,
  obstruction: 90,
  debris: 90,
  construction: 24 * 60,
  "road-closure": 24 * 60,
  "disabled-vehicle": 60,
  hazard: 90,
  other: 60,
};

export function computeExpiresAt(reportType: ReportType, from: Date = new Date()): Date {
  const minutes = DEFAULT_EXPIRATION_MINUTES[reportType];
  return new Date(from.getTime() + minutes * 60 * 1000);
}

export function isExpired(report: Pick<RoadReport, "expiresAt" | "status">, now: Date = new Date()): boolean {
  if (report.status !== "active") return true;
  return new Date(report.expiresAt).getTime() <= now.getTime();
}

// A report with enough "no longer there" feedback relative to confirmations is treated as
// cleared early rather than waiting out its full expiration window.
export function shouldAutoClean(confirmCount: number, dismissCount: number): boolean {
  return dismissCount - confirmCount >= 3;
}
