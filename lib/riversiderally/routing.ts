import type { Destination, LatLng } from "./types";

export interface RouteLeg {
  distanceMeters: number;
  durationSeconds: number;
}

export interface RouteResult {
  coordinates: LatLng[]; // road-following geometry, in order
  distanceMeters: number;
  durationSeconds: number;
  legs: RouteLeg[]; // one per consecutive waypoint pair
}

export class RoutingError extends Error {}

// OSRM's public demo server. Personal/testing use only per OSRM's usage policy — this is not
// a production routing service. If it is unreachable or rate-limits us, callers fall back to
// showing the raw waypoints connected by straight lines and a clear "unverified" warning.
const OSRM_DEMO_URL = "https://router.project-osrm.org/route/v1/driving/";

export async function fetchDrivingRoute(points: Destination[]): Promise<RouteResult> {
  if (points.length < 2) {
    throw new RoutingError("At least two waypoints are required to calculate a route.");
  }

  const coordsParam = points.map((p) => `${p.position.lon},${p.position.lat}`).join(";");
  const url = `${OSRM_DEMO_URL}${coordsParam}?overview=full&geometries=geojson&steps=false`;

  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: "application/json" } });
  } catch (err) {
    throw new RoutingError(
      `Could not reach the routing service (${err instanceof Error ? err.message : "network error"}).`,
    );
  }

  if (!response.ok) {
    throw new RoutingError(`Routing service returned an error (HTTP ${response.status}).`);
  }

  const data = await response.json();

  if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
    throw new RoutingError(`Routing service could not find a route (${data.code ?? "unknown error"}).`);
  }

  const route = data.routes[0];
  const coordinates: LatLng[] = route.geometry.coordinates.map(([lon, lat]: [number, number]) => ({
    lat,
    lon,
  }));

  const legs: RouteLeg[] = (route.legs ?? []).map((leg: { distance: number; duration: number }) => ({
    distanceMeters: leg.distance,
    durationSeconds: leg.duration,
  }));

  return {
    coordinates,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    legs,
  };
}

export function metersToMiles(meters: number): number {
  return meters / 1609.344;
}

export function secondsToHoursMinutes(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return `${hours} hr ${minutes} min`;
}

export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
