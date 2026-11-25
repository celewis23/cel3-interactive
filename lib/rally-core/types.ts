import type { Destination } from "@/lib/riversiderally/types";
import type { RegionConfig } from "./region";

// Platform-level domain vocabulary. The existing scouting UI still speaks in terms of
// `Destination` (it plays the role of both Waypoint and Checkpoint depending on `role`), so
// these types describe the same data from the platform's perspective rather than forcing an
// immediate rename through every component. New platform-level code (event registry, future
// multi-route features) should think in these terms.

export type Waypoint = Destination; // role: "shaping" — shapes the road geometry, not a stop.
export type Checkpoint = Destination; // role: "destination" — a place participants actually stop.

export interface Route {
  id: string;
  name: string;
  description: string;
  region: RegionConfig;
  waypoints: Destination[]; // ordered, mixed Waypoint/Checkpoint — matches RallyState.destinations today.
}

export interface RallyEventDefinition {
  id: string;
  routeId: string;
  defaultEventName: string;
  routeDescription: string;
  rallyType: "scenic-cruise" | "destination-rally" | "navigation-challenge" | "touring" | "club-meetup" | "charity";
  region: RegionConfig;
  seedDestinations: Destination[];
  defaultScoutingDate: string; // ISO date
  scoutingDateSunsetNote?: string;
  preDriveChecklist?: string[];
}

export interface ScoutingSession {
  id: string;
  eventId: string;
  routeId: string;
  startedAt: string;
}
