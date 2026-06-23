import { DateTime } from "luxon";
import type { LeadGeneratorSettings } from "./types";

export const LEAD_GENERATOR_SETTINGS_ID = "lead-generator-settings";

export const DEFAULT_LEAD_GENERATOR_SETTINGS: LeadGeneratorSettings = {
  _id: LEAD_GENERATOR_SETTINGS_ID,
  _type: "leadGeneratorSettings",
  enabled: false,
  frequency: "weekly",
  dayOfWeek: 2,
  dayOfMonth: 1,
  time: "09:00",
  timezone: "America/New_York",
  maxPerRun: 10,
  lastRunAt: null,
  lastRunStatus: null,
  lastRunMessage: null,
};

function parseTime(value: string) {
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  return {
    hour: Number.isFinite(hour) ? Math.min(Math.max(hour, 0), 23) : 9,
    minute: Number.isFinite(minute) ? Math.min(Math.max(minute, 0), 59) : 0,
  };
}

export function shouldRunLeadGenerator(settings: LeadGeneratorSettings, now = DateTime.utc()) {
  if (!settings.enabled) {
    return { shouldRun: false, reason: "Lead generator is disabled." };
  }

  const zone = settings.timezone || "America/New_York";
  const localNow = now.setZone(zone);
  const { hour, minute } = parseTime(settings.time || "09:00");

  if (localNow.hour !== hour || localNow.minute !== minute) {
    return { shouldRun: false, reason: "Not at the configured run time." };
  }

  if (settings.frequency === "weekly" && localNow.weekday !== settings.dayOfWeek) {
    return { shouldRun: false, reason: "Not on the configured weekday." };
  }

  if (settings.frequency === "monthly" && localNow.day !== settings.dayOfMonth) {
    return { shouldRun: false, reason: "Not on the configured day of month." };
  }

  if (settings.lastRunAt) {
    const lastRun = DateTime.fromISO(settings.lastRunAt).setZone(zone);
    if (lastRun.hasSame(localNow, "minute")) {
      return { shouldRun: false, reason: "Already ran for this scheduled minute." };
    }
  }

  return { shouldRun: true, reason: "Due now." };
}
