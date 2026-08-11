import { getMeterwiseConfig } from "@/lib/meterwise/config";

export class MeterwiseNotConfiguredError extends Error {
  constructor() {
    super("Meterwise is not connected");
    this.name = "MeterwiseNotConfiguredError";
  }
}

export class MeterwiseApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`Meterwise API error (${status})`);
    this.name = "MeterwiseApiError";
    this.status = status;
    this.body = body;
  }
}

async function meterwiseFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const config = await getMeterwiseConfig();
  if (!config) throw new MeterwiseNotConfiguredError();

  const base = config.baseUrl.replace(/\/+$/, "");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new MeterwiseApiError(res.status, body);
  return (body as { data?: T })?.data ?? (body as T);
}

// ── Phase 1 read-only endpoints ─────────────────────────────────────────────

export interface MeterwiseProviderBreakdown {
  providerKey: string;
  providerName: string;
  mtdCost: number;
  prevPeriodCost: number;
  changePercent: number;
  confidence: string;
}

export interface MeterwiseProjectBreakdown {
  projectId: string;
  projectName: string;
  mtdCost: number;
  prevPeriodCost: number;
  changePercent: number;
}

export interface MeterwiseOverview {
  mtdCost: number;
  mtdCostConfidence: string;
  projectedMonthlyCost: number;
  projectedConfidence: string;
  daysElapsed: number;
  daysInMonth: number;
  providerBreakdown: MeterwiseProviderBreakdown[];
  projectBreakdown: MeterwiseProjectBreakdown[];
}

export interface MeterwiseProject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  mtdCost: number;
  prevMonthCost: number;
}

export interface MeterwiseSyncLog {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  recordsIngested: number;
  errorCount: number;
  errors: string[] | null;
  provider: { key: string; name: string };
  account: { id: string; displayName: string };
}

export interface MeterwiseProviderAccount {
  id: string;
  displayName: string;
  credentialStatus: string;
  lastValidatedAt: string | null;
  createdAt: string;
  provider: { key: string; name: string; category: string; logoUrl: string | null };
}

export function getOverview() {
  return meterwiseFetch<MeterwiseOverview>("/overview");
}

export function listProjects() {
  return meterwiseFetch<MeterwiseProject[]>("/projects");
}

export function getProjectSummary(projectId: string) {
  return meterwiseFetch(`/projects/${projectId}/metrics/summary`);
}

export function getProjectTimeseries(projectId: string, params?: Record<string, string>) {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
  return meterwiseFetch(`/projects/${projectId}/metrics/timeseries${qs}`);
}

export function listSyncLogs(params?: Record<string, string>) {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
  return meterwiseFetch<MeterwiseSyncLog[]>(`/sync-logs${qs}`);
}

export function listProviderAccounts() {
  return meterwiseFetch<MeterwiseProviderAccount[]>("/provider-accounts");
}
