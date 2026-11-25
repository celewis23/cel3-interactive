import type { RallyState, ScoutingNote } from "@/lib/riversiderally/types";

// Abstractions so UI code depends on "a place to persist rally/scouting data," not on
// LocalStorage specifically. The initial implementation (lib/riversiderally/storage.ts) is
// browser-local; a future hosted backend implements the same interfaces and the only change
// elsewhere is which implementation gets imported.
export interface RallyStateRepository {
  load(eventId: string): RallyState;
  save(eventId: string, state: RallyState): void;
  reset(eventId: string): RallyState;
}

export interface ScoutingNotesRepository {
  load(eventId: string): ScoutingNote[];
  save(eventId: string, notes: ScoutingNote[]): void;
  clear(eventId: string): void;
}
