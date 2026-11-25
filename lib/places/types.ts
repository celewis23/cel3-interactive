import type { LatLng } from "@/lib/riversiderally/types";

export type PoiCategory =
  | "gas"
  | "ev-charging"
  | "food"
  | "coffee"
  | "convenience"
  | "mechanic"
  | "tire-shop"
  | "towing"
  | "auto-parts"
  | "dealership-service"
  | "restroom"
  | "park"
  | "scenic-overlook"
  | "parking"
  | "historic-landmark"
  | "hotel";

export const POI_CATEGORY_GROUPS: { group: string; categories: PoiCategory[] }[] = [
  { group: "Fuel", categories: ["gas", "ev-charging"] },
  { group: "Food", categories: ["food", "coffee", "convenience"] },
  {
    group: "Automotive services",
    categories: ["mechanic", "tire-shop", "towing", "auto-parts", "dealership-service"],
  },
  { group: "Travel", categories: ["restroom", "park", "scenic-overlook", "parking", "historic-landmark", "hotel"] },
];

export const POI_CATEGORY_LABELS: Record<PoiCategory, string> = {
  gas: "Gas station",
  "ev-charging": "EV charging",
  food: "Restaurant",
  coffee: "Coffee shop",
  convenience: "Convenience store",
  mechanic: "Mechanic",
  "tire-shop": "Tire shop",
  towing: "Towing",
  "auto-parts": "Auto parts store",
  "dealership-service": "Dealership service",
  restroom: "Public restroom",
  park: "Park",
  "scenic-overlook": "Scenic overlook",
  parking: "Parking area",
  "historic-landmark": "Historic landmark",
  hotel: "Hotel",
};

export interface Poi {
  id: string; // provider-prefixed, e.g. "osm:node:12345"
  source: "osm-overpass";
  category: PoiCategory;
  name: string;
  position: LatLng;
  address?: string;
  phone?: string;
  website?: string;
  openingHours?: string; // raw OSM opening_hours syntax, shown as-is, never interpreted as live status
  brand?: string;
  tags: Record<string, string>;
}

export interface BoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface PoiQuery {
  bbox: BoundingBox;
  categories: PoiCategory[];
  limit?: number;
}

export interface PoiProvider {
  readonly name: string;
  search(query: PoiQuery): Promise<Poi[]>;
}

export class PoiProviderError extends Error {}
