import type { Poi } from "./types";

const FAVORITES_KEY = "riverside-rally:poi-favorites:v1";
const RALLY_STOP_NOTES_KEY = "riverside-rally:poi-rally-notes:v1";

function isBrowser() {
  return typeof window !== "undefined";
}

export interface SavedPoi {
  poi: Poi;
  savedAt: string;
}

export function loadFavorites(): SavedPoi[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as SavedPoi[]) : [];
  } catch {
    return [];
  }
}

function saveFavorites(list: SavedPoi[]): void {
  if (isBrowser()) window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
}

export function isFavorite(poiId: string): boolean {
  return loadFavorites().some((f) => f.poi.id === poiId);
}

export function toggleFavorite(poi: Poi): SavedPoi[] {
  const current = loadFavorites();
  const exists = current.some((f) => f.poi.id === poi.id);
  const next = exists ? current.filter((f) => f.poi.id !== poi.id) : [...current, { poi, savedAt: new Date().toISOString() }];
  saveFavorites(next);
  return next;
}

// Rally-stop attributes for the "Recommended Rally Stops" / "Approved Rally Stops" workflow.
// Every field here is something the user themselves attests to after visiting — nothing is
// inferred automatically from the POI's name, location, or category.
export interface RallyStopEvaluation {
  poiId: string;
  blackOwned?: boolean;
  groupDining?: boolean;
  groupParking?: boolean;
  accessibleEntrance?: boolean;
  restrooms?: boolean;
  reservationsRecommended?: boolean;
  scenicPhotoPotential?: boolean;
  personallyScoutedAndApproved?: boolean;
  privateNotes?: string;
  updatedAt: string;
}

export function loadRallyStopEvaluations(): Record<string, RallyStopEvaluation> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(RALLY_STOP_NOTES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, RallyStopEvaluation>) : {};
  } catch {
    return {};
  }
}

export function saveRallyStopEvaluation(evaluation: Omit<RallyStopEvaluation, "updatedAt">): Record<string, RallyStopEvaluation> {
  const all = loadRallyStopEvaluations();
  const next = { ...all, [evaluation.poiId]: { ...evaluation, updatedAt: new Date().toISOString() } };
  if (isBrowser()) window.localStorage.setItem(RALLY_STOP_NOTES_KEY, JSON.stringify(next));
  return next;
}

export function approvedRallyStops(evaluations: Record<string, RallyStopEvaluation>): string[] {
  return Object.values(evaluations)
    .filter((e) => e.personallyScoutedAndApproved)
    .map((e) => e.poiId);
}
