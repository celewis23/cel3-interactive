import { SEED_DESTINATIONS, JAMES_RIVER_RUN_EVENT_ID, RICHMOND_SUNSET_NOV_25_2026, RALLY_SUBTITLE } from "@/lib/riversiderally/seed";
import { RICHMOND_REGION } from "./region";
import type { RallyEventDefinition } from "./types";

export const JAMES_RIVER_RUN_EVENT: RallyEventDefinition = {
  id: JAMES_RIVER_RUN_EVENT_ID,
  routeId: `${JAMES_RIVER_RUN_EVENT_ID}-route`,
  defaultEventName: "James River Run",
  routeDescription: RALLY_SUBTITLE,
  rallyType: "scenic-cruise",
  region: RICHMOND_REGION,
  seedDestinations: SEED_DESTINATIONS,
  defaultScoutingDate: "2026-11-25",
  scoutingDateSunsetNote: `Sunset Nov 25, 2026: ${RICHMOND_SUNSET_NOV_25_2026}. Plan to be off scenic roads before dark.`,
  preDriveChecklist: [
    "Confirm Southern Kitchen's holiday hours before counting on it as the dining stop.",
    "Confirm Tucker Park's access/hours and whether a permit is needed for a group visit.",
    "Confirm Stony Point Fashion Park's policy on using their lot as a gathering point.",
    "None of the above are live-verified by this app — confirm them yourself before the drive.",
  ],
};

// Illustrative future events, not verified or scheduled — kept out of RALLY_EVENTS (and
// therefore out of the UI) until they have real routes and dates. This is here so adding a
// second real event later is "add an entry + a route," not an architecture change.
export const RALLY_EVENTS: RallyEventDefinition[] = [JAMES_RIVER_RUN_EVENT];

// Only one event is seeded today, so this always resolves to James River Run. Once multiple
// events exist, this is the one function that needs to change (e.g. to read a route param or
// a user selection) — no other module should hardcode which event is active.
export function getActiveEvent(): RallyEventDefinition {
  return JAMES_RIVER_RUN_EVENT;
}

export function getEventById(id: string): RallyEventDefinition | undefined {
  return RALLY_EVENTS.find((e) => e.id === id);
}
