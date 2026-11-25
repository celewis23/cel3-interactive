import type { Poi, PoiCategory } from "./types";

// Overpass QL tag filters per category. Some categories (towing, dealership service) have no
// single standard OSM tag — coverage for those is inherently sparse/inconsistent, which the UI
// should surface rather than paper over.
export const CATEGORY_OVERPASS_FILTERS: Record<PoiCategory, string[]> = {
  gas: ['["amenity"="fuel"]'],
  "ev-charging": ['["amenity"="charging_station"]'],
  food: ['["amenity"="restaurant"]', '["amenity"="fast_food"]'],
  coffee: ['["amenity"="cafe"]'],
  convenience: ['["shop"="convenience"]'],
  mechanic: ['["shop"="car_repair"]'],
  "tire-shop": ['["shop"="tyres"]'],
  towing: ['["shop"="car_repair"]["service:vehicle:towing"="yes"]'],
  "auto-parts": ['["shop"="car_parts"]'],
  "dealership-service": ['["shop"="car"]["service:vehicle:car_repair"="yes"]', '["shop"="car"]'],
  restroom: ['["amenity"="toilets"]'],
  park: ['["leisure"="park"]'],
  "scenic-overlook": ['["tourism"="viewpoint"]'],
  parking: ['["amenity"="parking"]'],
  "historic-landmark": ['["historic"]'],
  hotel: ['["tourism"="hotel"]'],
};

function categoryFromTags(tags: Record<string, string>): PoiCategory | null {
  if (tags.amenity === "fuel") return "gas";
  if (tags.amenity === "charging_station") return "ev-charging";
  if (tags.amenity === "restaurant" || tags.amenity === "fast_food") return "food";
  if (tags.amenity === "cafe") return "coffee";
  if (tags.shop === "convenience") return "convenience";
  if (tags.shop === "tyres") return "tire-shop";
  if (tags.shop === "car_repair" && tags["service:vehicle:towing"] === "yes") return "towing";
  if (tags.shop === "car_repair") return "mechanic";
  if (tags.shop === "car_parts") return "auto-parts";
  if (tags.shop === "car") return "dealership-service";
  if (tags.amenity === "toilets") return "restroom";
  if (tags.leisure === "park") return "park";
  if (tags.tourism === "viewpoint") return "scenic-overlook";
  if (tags.amenity === "parking") return "parking";
  if (tags.historic) return "historic-landmark";
  if (tags.tourism === "hotel") return "hotel";
  return null;
}

function buildAddress(tags: Record<string, string>): string | undefined {
  const parts = [
    tags["addr:housenumber"] && tags["addr:street"]
      ? `${tags["addr:housenumber"]} ${tags["addr:street"]}`
      : tags["addr:street"],
    tags["addr:city"],
    tags["addr:state"],
    tags["addr:postcode"],
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export function normalizeOverpassElements(elements: OverpassElement[]): Poi[] {
  const results: Poi[] = [];
  for (const el of elements) {
    const tags = el.tags ?? {};
    const category = categoryFromTags(tags);
    if (!category) continue;
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;
    const name = tags.name ?? tags.brand ?? "Unnamed location";

    results.push({
      id: `osm:${el.type}:${el.id}`,
      source: "osm-overpass",
      category,
      name,
      position: { lat, lon },
      address: buildAddress(tags),
      phone: tags.phone ?? tags["contact:phone"],
      website: tags.website ?? tags["contact:website"],
      openingHours: tags.opening_hours,
      brand: tags.brand,
      tags,
    });
  }
  return results;
}
