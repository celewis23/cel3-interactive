import type { Destination, RallyState, ScoutingNote } from "./types";
import { INITIAL_RALLY_STATE, JAMES_RIVER_RUN_EVENT_ID } from "./seed";
import type { RallyStateRepository, ScoutingNotesRepository } from "@/lib/rally-core/repository";

// Pre-namespacing keys, kept only so a browser that saved data before per-event namespacing
// existed doesn't lose it. Only ever read as a migration source for James River Run (the only
// event that could have written them), never written again.
const LEGACY_RALLY_STATE_KEY = "riverside-rally:state:v1";
const LEGACY_SCOUTING_NOTES_KEY = "riverside-rally:scouting-notes:v1";

function rallyStateKey(eventId: string): string {
  return `riverside-rally:${eventId}:state:v1`;
}

function scoutingNotesKey(eventId: string): string {
  return `riverside-rally:${eventId}:scouting-notes:v1`;
}

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadRallyState(eventId: string): RallyState {
  if (!isBrowser()) return INITIAL_RALLY_STATE;
  try {
    const raw = window.localStorage.getItem(rallyStateKey(eventId));
    if (raw) {
      const parsed = JSON.parse(raw) as RallyState;
      if (parsed.destinations && parsed.destinations.length > 0) return parsed;
    } else if (eventId === JAMES_RIVER_RUN_EVENT_ID) {
      const legacy = window.localStorage.getItem(LEGACY_RALLY_STATE_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy) as RallyState;
        if (parsed.destinations && parsed.destinations.length > 0) {
          const migrated = { ...parsed, eventId };
          saveRallyState(eventId, migrated);
          return migrated;
        }
      }
    }
    return INITIAL_RALLY_STATE;
  } catch {
    return INITIAL_RALLY_STATE;
  }
}

export function saveRallyState(eventId: string, state: RallyState): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(rallyStateKey(eventId), JSON.stringify(state));
}

export function resetRallyState(eventId: string): RallyState {
  if (isBrowser()) {
    window.localStorage.removeItem(rallyStateKey(eventId));
  }
  return INITIAL_RALLY_STATE;
}

export function loadScoutingNotes(eventId: string): ScoutingNote[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(scoutingNotesKey(eventId));
    if (raw) return JSON.parse(raw) as ScoutingNote[];
    if (eventId === JAMES_RIVER_RUN_EVENT_ID) {
      const legacy = window.localStorage.getItem(LEGACY_SCOUTING_NOTES_KEY);
      if (legacy) {
        const notes = (JSON.parse(legacy) as ScoutingNote[]).map((n) => ({ ...n, eventId }));
        saveScoutingNotes(eventId, notes);
        return notes;
      }
    }
    return [];
  } catch {
    return [];
  }
}

export function saveScoutingNotes(eventId: string, notes: ScoutingNote[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(scoutingNotesKey(eventId), JSON.stringify(notes));
}

export function clearScoutingNotes(eventId: string): void {
  if (isBrowser()) window.localStorage.removeItem(scoutingNotesKey(eventId));
}

export const localRallyStateRepository: RallyStateRepository = {
  load: loadRallyState,
  save: saveRallyState,
  reset: resetRallyState,
};

export const localScoutingNotesRepository: ScoutingNotesRepository = {
  load: loadScoutingNotes,
  save: saveScoutingNotes,
  clear: clearScoutingNotes,
};

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
