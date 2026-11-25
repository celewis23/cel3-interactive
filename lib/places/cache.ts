import type { BoundingBox, Poi, PoiCategory } from "./types";

interface CacheEntry {
  expiresAt: number;
  pois: Poi[];
}

const TTL_MS = 2 * 60 * 1000; // Overpass data doesn't change fast enough to justify shorter caching.
const cache = new Map<string, CacheEntry>();

function roundedBboxKey(bbox: BoundingBox): string {
  // Round to ~0.01 degree (~1km) so nearby requests reuse the same cache entry.
  const r = (n: number) => Math.round(n * 100) / 100;
  return `${r(bbox.south)},${r(bbox.west)},${r(bbox.north)},${r(bbox.east)}`;
}

export function cacheKey(bbox: BoundingBox, categories: PoiCategory[]): string {
  return `${roundedBboxKey(bbox)}|${[...categories].sort().join(",")}`;
}

export function getCached(key: string): Poi[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.pois;
}

export function setCached(key: string, pois: Poi[]): void {
  cache.set(key, { expiresAt: Date.now() + TTL_MS, pois });
}
