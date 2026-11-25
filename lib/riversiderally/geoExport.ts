import type { Destination, LatLng } from "./types";

export function routeToGeoJson(destinations: Destination[], routeCoordinates: LatLng[] | null) {
  const features: GeoJSON.Feature[] = destinations.map((d) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [d.position.lon, d.position.lat] },
    properties: {
      name: d.name,
      category: d.category,
      role: d.role,
      optional: d.optional,
      coordinatesVerified: d.coordinatesVerified,
      address: d.address ?? null,
      description: d.description,
    },
  }));

  if (routeCoordinates && routeCoordinates.length > 1) {
    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: routeCoordinates.map((c) => [c.lon, c.lat]),
      },
      properties: { name: "Route geometry", source: "OSRM driving route" },
    });
  }

  return {
    type: "FeatureCollection",
    features,
  } satisfies GeoJSON.FeatureCollection;
}

export function routeToGpx(eventName: string, destinations: Destination[], routeCoordinates: LatLng[] | null): string {
  const waypoints = destinations
    .map(
      (d) =>
        `  <wpt lat="${d.position.lat}" lon="${d.position.lon}"><name>${escapeXml(d.name)}</name><desc>${escapeXml(
          d.description,
        )}</desc></wpt>`,
    )
    .join("\n");

  const trackPoints =
    routeCoordinates && routeCoordinates.length > 1
      ? routeCoordinates.map((c) => `      <trkpt lat="${c.lat}" lon="${c.lon}"></trkpt>`).join("\n")
      : "";

  const track =
    routeCoordinates && routeCoordinates.length > 1
      ? `  <trk>\n    <name>${escapeXml(eventName)}</name>\n    <trkseg>\n${trackPoints}\n    </trkseg>\n  </trk>\n`
      : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Riverside Rally" xmlns="http://www.topografix.com/GPX/1/1">
${waypoints}
${track}</gpx>`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}
