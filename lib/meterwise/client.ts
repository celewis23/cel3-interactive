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
  return body as T;
}

// ── Phase 1 read-only endpoints ─────────────────────────────────────────────

export function getOverview() {
  return meterwiseFetch("/overview");
}

export function listProjects() {
  return meterwiseFetch("/projects");
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
  return meterwiseFetch(`/sync-logs${qs}`);
}

export function listProviderAccounts() {
  return meterwiseFetch("/provider-accounts");
}
