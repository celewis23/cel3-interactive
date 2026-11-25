import type { Destination, RallyState, ScoutingNote } from "./types";
import { INITIAL_RALLY_STATE } from "./seed";

const RALLY_STATE_KEY = "riverside-rally:state:v1";
const SCOUTING_NOTES_KEY = "riverside-rally:scouting-notes:v1";

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadRallyState(): RallyState {
  if (!isBrowser()) return INITIAL_RALLY_STATE;
  try {
    const raw = window.localStorage.getItem(RALLY_STATE_KEY);
    if (!raw) return INITIAL_RALLY_STATE;
    const parsed = JSON.parse(raw) as RallyState;
    if (!parsed.destinations || parsed.destinations.length === 0) return INITIAL_RALLY_STATE;
    return parsed;
  } catch {
    return INITIAL_RALLY_STATE;
  }
}

export function saveRallyState(state: RallyState): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(RALLY_STATE_KEY, JSON.stringify(state));
}

export function resetRallyState(): RallyState {
  if (isBrowser()) {
    window.localStorage.removeItem(RALLY_STATE_KEY);
  }
  return INITIAL_RALLY_STATE;
}

export function loadScoutingNotes(): ScoutingNote[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(SCOUTING_NOTES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ScoutingNote[];
  } catch {
    return [];
  }
}

export function saveScoutingNotes(notes: ScoutingNote[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(SCOUTING_NOTES_KEY, JSON.stringify(notes));
}

export function clearScoutingNotes(): void {
  if (isBrowser()) window.localStorage.removeItem(SCOUTING_NOTES_KEY);
}

export interface ScoutingExport {
  exportedAt: string;
  eventName: string;
  destinations: Destination[];
  visited: Record<string, boolean>;
  notes: ScoutingNote[];
}

export function buildScoutingExport(state: RallyState, notes: ScoutingNote[]): ScoutingExport {
  return {
    exportedAt: new Date().toISOString(),
    eventName: state.eventName,
    destinations: state.destinations,
    visited: state.visited,
    notes,
  };
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  triggerDownload(filename, blob);
}

export function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function importScoutingExport(json: string): ScoutingExport {
  const parsed = JSON.parse(json) as ScoutingExport;
  if (!parsed.destinations || !Array.isArray(parsed.notes)) {
    throw new Error("This file doesn't look like a Riverside Rally scouting export.");
  }
  return parsed;
}
