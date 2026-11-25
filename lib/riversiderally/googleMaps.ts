import type { Destination } from "./types";

// Documented Google Maps URL scheme: https://developers.google.com/maps/documentation/urls/get-started

export function googleMapsPlaceUrl(dest: Destination): string {
  const query = encodeURIComponent(dest.address ?? `${dest.position.lat},${dest.position.lon}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function googleMapsDirectionsUrl(destination: Destination, origin?: Destination): string {
  const params = new URLSearchParams({
    api: "1",
    destination: destination.address ?? `${destination.position.lat},${destination.position.lon}`,
    travelmode: "driving",
  });
  if (origin) {
    params.set("origin", origin.address ?? `${origin.position.lat},${origin.position.lon}`);
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

// Google's documented "dir" URL supports a waypoints param, but real-world waypoint-count
// limits vary by device/app version and are not officially guaranteed, so this is offered
// as a best-effort multi-stop link. Leg-by-leg links (googleMapsDirectionsUrl per stop) are
// the reliable fallback referenced elsewhere in the UI.
export function googleMapsMultiStopUrl(destinations: Destination[]): string {
  if (destinations.length === 0) return "https://www.google.com/maps";
  const toParam = (d: Destination) => d.address ?? `${d.position.lat},${d.position.lon}`;
  const origin = destinations[0];
  const finalDest = destinations[destinations.length - 1];
  const waypoints = destinations.slice(1, -1).map(toParam);
  const params = new URLSearchParams({
    api: "1",
    origin: toParam(origin),
    destination: toParam(finalDest),
    travelmode: "driving",
  });
  if (waypoints.length > 0) {
    params.set("waypoints", waypoints.join("|"));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
