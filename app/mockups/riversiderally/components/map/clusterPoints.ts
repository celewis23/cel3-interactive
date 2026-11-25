import type { LatLng } from "@/lib/riversiderally/types";

export interface Clusterable {
  id: string;
  position: LatLng;
}

export interface Cluster<T extends Clusterable> {
  position: LatLng;
  items: T[];
}

// Simple grid-snap clustering: good enough for a few hundred POIs without pulling in a
// dedicated clustering library. Cell size shrinks as the map zooms in so markers separate.
export function clusterPoints<T extends Clusterable>(items: T[], zoom: number): Cluster<T>[] {
  const cellDegrees = Math.max(0.15 / Math.pow(2, Math.max(zoom - 8, 0)), 0.0008);
  const buckets = new Map<string, T[]>();

  for (const item of items) {
    const key = `${Math.round(item.position.lat / cellDegrees)}:${Math.round(item.position.lon / cellDegrees)}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }

  return Array.from(buckets.values()).map((groupItems) => {
    const lat = groupItems.reduce((sum, i) => sum + i.position.lat, 0) / groupItems.length;
    const lon = groupItems.reduce((sum, i) => sum + i.position.lon, 0) / groupItems.length;
    return { position: { lat, lon }, items: groupItems };
  });
}
