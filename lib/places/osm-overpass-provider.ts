import type { Poi, PoiProvider, PoiQuery } from "./types";
import { PoiProviderError } from "./types";
import { CATEGORY_OVERPASS_FILTERS } from "./poi-normalization";
import { normalizeOverpassElements } from "./poi-normalization";

// Overpass's public instances are shared, rate-limited infrastructure, not a dedicated
// production API. This provider is meant to run server-side (see the /api/riversiderally/poi
// route) so requests are deduplicated and cached instead of hitting Overpass per client.
const OVERPASS_ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];

function buildQuery(query: PoiQuery): string {
  const { south, west, north, east } = query.bbox;
  const bboxStr = `${south},${west},${north},${east}`;
  const filters = query.categories.flatMap((cat) => CATEGORY_OVERPASS_FILTERS[cat] ?? []);
  const clauses = filters
    .map((filter) => `  node${filter}(${bboxStr});\n  way${filter}(${bboxStr});`)
    .join("\n");
  return `[out:json][timeout:25];\n(\n${clauses}\n);\nout center ${query.limit ?? 200};`;
}

export class OsmOverpassProvider implements PoiProvider {
  readonly name = "osm-overpass";

  async search(query: PoiQuery): Promise<Poi[]> {
    if (query.categories.length === 0) return [];
    const ql = buildQuery(query);

    let lastError: unknown;
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: ql,
        });
        if (!res.ok) {
          lastError = new Error(`Overpass returned HTTP ${res.status}`);
          continue;
        }
        const data = await res.json();
        return normalizeOverpassElements(data.elements ?? []);
      } catch (err) {
        lastError = err;
      }
    }
    throw new PoiProviderError(
      `Could not reach OpenStreetMap/Overpass (${lastError instanceof Error ? lastError.message : "unknown error"}).`,
    );
  }
}
