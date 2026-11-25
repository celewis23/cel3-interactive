import type { BoundingBox, Poi, PoiCategory } from "./types";
import { boundingBoxForPoint, boundingBoxForRoute, filterPoisNearPoint, filterPoisNearRoute, type PoiWithDistance } from "./route-proximity";
import type { LatLng } from "@/lib/riversiderally/types";

export type SearchMode = "near-me" | "along-route" | "near-next-checkpoint" | "near-stop" | "visible-area";

export interface PoiSearchParams {
  mode: SearchMode;
  categories: PoiCategory[];
  maxOffRouteMiles: number;
  routeCoordinates: LatLng[] | null;
  userLocation: LatLng | null;
  selectedStopPosition: LatLng | null;
  nextCheckpointPosition: LatLng | null;
  visibleBounds: BoundingBox | null;
}

export class PoiSearchError extends Error {}

function resolveBbox(params: PoiSearchParams): { bbox: BoundingBox; anchor: LatLng | null } {
  const { mode, maxOffRouteMiles, routeCoordinates, userLocation, selectedStopPosition, nextCheckpointPosition, visibleBounds } = params;

  switch (mode) {
    case "near-me":
      if (!userLocation) throw new PoiSearchError("Your location isn't available yet — allow location access and try again.");
      return { bbox: boundingBoxForPoint(userLocation, maxOffRouteMiles), anchor: userLocation };
    case "near-next-checkpoint":
      if (!nextCheckpointPosition) throw new PoiSearchError("There's no upcoming checkpoint to search near.");
      return { bbox: boundingBoxForPoint(nextCheckpointPosition, maxOffRouteMiles), anchor: nextCheckpointPosition };
    case "near-stop":
      if (!selectedStopPosition) throw new PoiSearchError("Select a stop on the map or itinerary first.");
      return { bbox: boundingBoxForPoint(selectedStopPosition, maxOffRouteMiles), anchor: selectedStopPosition };
    case "visible-area":
      if (!visibleBounds) throw new PoiSearchError("Map bounds aren't ready yet.");
      return { bbox: visibleBounds, anchor: null };
    case "along-route":
    default:
      if (!routeCoordinates || routeCoordinates.length < 2) {
        throw new PoiSearchError("The route hasn't been calculated yet — add at least two stops.");
      }
      return { bbox: boundingBoxForRoute(routeCoordinates, maxOffRouteMiles), anchor: null };
  }
}

export async function searchPois(params: PoiSearchParams): Promise<PoiWithDistance[]> {
  const { bbox, anchor } = resolveBbox(params);

  const query = new URLSearchParams({
    south: String(bbox.south),
    west: String(bbox.west),
    north: String(bbox.north),
    east: String(bbox.east),
    categories: params.categories.join(","),
  });

  const res = await fetch(`/api/riversiderally/poi?${query.toString()}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new PoiSearchError(data.error ?? `Could not search for places (HTTP ${res.status}).`);
  }
  const data = await res.json();
  const pois = data.pois as Poi[];

  if (params.mode === "visible-area") {
    return pois.map((p) => ({ ...p, distanceFromRouteMiles: 0 }));
  }
  if (anchor) {
    return filterPoisNearPoint(pois, anchor, params.maxOffRouteMiles);
  }
  if (params.routeCoordinates && params.routeCoordinates.length >= 2) {
    return filterPoisNearRoute(pois, params.routeCoordinates, params.maxOffRouteMiles);
  }
  return pois.map((p) => ({ ...p, distanceFromRouteMiles: 0 }));
}
