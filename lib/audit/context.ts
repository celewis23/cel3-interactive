import { AsyncLocalStorage } from "node:async_hooks";

export type ActivitySource = "manual" | "automatic" | "external";
export type ActivityStatus = "running" | "success" | "failed" | "partial" | "skipped" | "accepted";

export const activityContext = new AsyncLocalStorage<{
  runId: string;
  source: ActivitySource;
  pending: Promise<unknown>[];
  eventsWritten: number;
}>();
