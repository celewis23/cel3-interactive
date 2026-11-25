export type StopCategory =
  | "start-finish"
  | "scenic-segment"
  | "checkpoint"
  | "dining"
  | "optional"
  | "unverified";

export type WaypointRole = "destination" | "shaping";

export interface LatLng {
  lat: number;
  lon: number;
}

export interface Destination {
  id: string;
  name: string;
  role: WaypointRole;
  category: StopCategory;
  position: LatLng;
  address?: string;
  description: string;
  purpose?: string;
  plannedStopMinutes: number;
  optional: boolean;
  excluded?: boolean;
  coordinatesVerified: boolean;
  checklist?: string[];
  roadAccessNotes?: string;
  parkingObservations?: string;
  restroomAvailability?: string;
  groupCapacityEstimate?: string;
  contactInfo?: string;
  photoGallery?: string[];
}

export type RatingValue = 1 | 2 | 3 | 4 | 5 | null;

export type RecommendChoice = "yes" | "maybe" | "no" | null;

export type ScoutingFlag =
  | "potholes"
  | "narrow-road"
  | "blind-curve"
  | "heavy-traffic"
  | "poor-visibility"
  | "difficult-intersection"
  | "limited-parking"
  | "restroom-available"
  | "good-photo-location"
  | "suitable-for-group-stop"
  | "needs-further-investigation";

export interface ScoutingNote {
  id: string;
  destinationId: string;
  recordedAt: string;
  roadQuality: RatingValue;
  scenicValue: RatingValue;
  drivingEnjoyment: RatingValue;
  parking: RatingValue | "n/a";
  groupSuitability: RatingValue;
  welcomingAtmosphere: RatingValue | "not-yet-evaluated";
  notes: string;
  flags: ScoutingFlag[];
  recommend: RecommendChoice;
}

export interface ScoutingPhoto {
  id: string;
  destinationId: string;
  blob: Blob;
  caption?: string;
  takenAt: string;
  gps?: LatLng;
}

export interface RallyState {
  eventName: string;
  scoutingDate: string;
  destinations: Destination[];
  visited: Record<string, boolean>;
}
