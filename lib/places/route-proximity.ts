import { lineString, point } from "@turf/helpers";
import { pointToLineDistance } from "@turf/point-to-line-distance";
import { distance as turfDistance } from "@turf/distance";
import { bbox as turfBbox } from "@turf/bbox";
import { buffer as turfBuffer } from "@turf/buffer";
import type { BoundingBox, Poi } from "./types";
import type { LatLng } from "@/lib/riversiderally/types";

export interface PoiWithDistance extends Poi {
  distanceFromRouteMiles: number;
}

export function boundingBoxForRoute(coordinates: LatLng[], paddingMiles: number): BoundingBox {
  if (coordinates.length === 0) {
    throw new Error("Cannot compute a bounding box for an empty route.");
  }
  const line = lineString(coordinates.map((c) => [c.lon, c.lat]));
  const buffered = turfBuffer(line, paddingMiles, { units: "miles" });
  if (!buffered) throw new Error("Could not compute a buffered bounding box for this route.");
  const [west, south, east, north] = turfBbox(buffered);
  return { south, west, north, east };
}

export function boundingBoxForPoint(center: LatLng, radiusMiles: number): BoundingBox {
  const buffered = turfBuffer(point([center.lon, center.lat]), radiusMiles, { units: "miles" });
  if (!buffered) throw new Error("Could not compute a buffered bounding box for this point.");
  const [west, south, east, north] = turfBbox(buffered);
  return { south, west, north, east };
}

export function filterPoisNearRoute(pois: Poi[], routeCoordinates: LatLng[], maxDistanceMiles: number): PoiWithDistance[] {
  if (routeCoordinates.length < 2) return [];
  const line = lineString(routeCoordinates.map((c) => [c.lon, c.lat]));
  const results: PoiWithDistance[] = [];
  for (const poi of pois) {
    const distanceFromRouteMiles = pointToLineDistance(point([poi.position.lon, poi.position.lat]), line, {
      units: "miles",
    });
    if (distanceFromRouteMiles <= maxDistanceMiles) {
      results.push({ ...poi, distanceFromRouteMiles });
    }
  }
  return results.sort((a, b) => a.distanceFromRouteMiles - b.distanceFromRouteMiles);
}

export function filterPoisNearPoint(pois: Poi[], center: LatLng, maxDistanceMiles: number): PoiWithDistance[] {
  const results: PoiWithDistance[] = [];
  for (const poi of pois) {
    const distanceFromRouteMiles = turfDistance(point([center.lon, center.lat]), point([poi.position.lon, poi.position.lat]), {
      units: "miles",
    });
    if (distanceFromRouteMiles <= maxDistanceMiles) {
      results.push({ ...poi, distanceFromRouteMiles });
    }
  }
  return results.sort((a, b) => a.distanceFromRouteMiles - b.distanceFromRouteMiles);
}
