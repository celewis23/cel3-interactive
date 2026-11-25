"use client";

import type { PoiWithDistance } from "@/lib/places/route-proximity";
import { POI_CATEGORY_LABELS } from "@/lib/places/types";

export default function POIResults({
  results,
  loading,
  error,
  favoriteIds,
  onSelect,
}: {
  results: PoiWithDistance[];
  loading: boolean;
  error: string | null;
  favoriteIds: Set<string>;
  onSelect: (poi: PoiWithDistance) => void;
}) {
  if (loading) {
    return <p className="py-6 text-center text-sm text-neutral-500">Searching OpenStreetMap…</p>;
  }
  if (error) {
    return <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>;
  }
  if (results.length === 0) {
    return <p className="py-6 text-center text-sm text-neutral-500">No results yet. Pick categories and run a search.</p>;
  }

  return (
    <ul className="max-h-80 space-y-1.5 overflow-y-auto">
      {results.map((poi) => (
        <li key={poi.id}>
          <button
            onClick={() => onSelect(poi)}
            className="flex w-full items-start justify-between gap-2 rounded-lg bg-neutral-900/60 px-3 py-2.5 text-left hover:bg-neutral-800"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {poi.name} {favoriteIds.has(poi.id) && <span className="text-amber-400">★</span>}
              </p>
              <p className="text-xs text-neutral-500">{POI_CATEGORY_LABELS[poi.category]}</p>
              {poi.address && <p className="truncate text-xs text-neutral-600">{poi.address}</p>}
            </div>
            <span className="shrink-0 text-xs text-neutral-400">{poi.distanceFromRouteMiles.toFixed(1)} mi</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
