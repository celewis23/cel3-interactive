"use client";

import { useState } from "react";
import { Compass, X } from "lucide-react";
import type { PoiCategory } from "@/lib/places/types";
import type { PoiWithDistance } from "@/lib/places/route-proximity";
import type { SearchMode } from "@/lib/places/poi-search";
import CategoryFilters, { ALL_CATEGORIES } from "./CategoryFilters";
import RouteDistanceFilter from "./RouteDistanceFilter";
import POISearch from "./POISearch";
import POIResults from "./POIResults";

interface DiscoverPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: PoiCategory[];
  onCategoriesChange: (categories: PoiCategory[]) => void;
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  maxDistanceMiles: number;
  onDistanceChange: (miles: number) => void;
  onRunSearch: () => void;
  results: PoiWithDistance[];
  loading: boolean;
  error: string | null;
  favoriteIds: Set<string>;
  onSelectResult: (poi: PoiWithDistance) => void;
}

export default function DiscoverPanel({
  open,
  onOpenChange,
  categories,
  onCategoriesChange,
  mode,
  onModeChange,
  maxDistanceMiles,
  onDistanceChange,
  onRunSearch,
  results,
  loading,
  error,
  favoriteIds,
  onSelectResult,
}: DiscoverPanelProps) {
  const [autoRan, setAutoRan] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => {
          onOpenChange(true);
          if (!autoRan) {
            setAutoRan(true);
            onRunSearch();
          }
        }}
        className="absolute bottom-24 left-1/2 z-[900] flex -translate-x-1/2 items-center gap-2 rounded-full bg-amber-600 px-4 py-2.5 text-sm font-semibold text-black shadow-lg hover:bg-amber-500 md:bottom-4 md:left-4 md:translate-x-0"
      >
        <Compass size={16} /> Discover
      </button>
    );
  }

  return (
    <div className="absolute inset-x-2 bottom-2 z-[950] max-h-[70vh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-950/98 p-3 shadow-2xl backdrop-blur md:inset-x-auto md:bottom-4 md:left-4 md:w-96">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Discover places</h3>
        <button onClick={() => onOpenChange(false)} className="rounded-full p-1 text-neutral-400 hover:bg-neutral-800">
          <X size={16} />
        </button>
      </div>

      <div className="mt-2">
        <POISearch
          onParsed={(parsed) => {
            if (parsed.categories.length > 0) onCategoriesChange(parsed.categories);
            if (parsed.maxDistanceMiles) onDistanceChange(parsed.maxDistanceMiles);
            onRunSearch();
          }}
        />
      </div>

      <div className="mt-3">
        <CategoryFilters active={categories} onChange={onCategoriesChange} />
      </div>

      <div className="mt-3">
        <RouteDistanceFilter mode={mode} onModeChange={onModeChange} maxDistanceMiles={maxDistanceMiles} onDistanceChange={onDistanceChange} />
      </div>

      <button
        onClick={onRunSearch}
        className="mt-3 w-full rounded-lg bg-amber-600 py-2 text-sm font-semibold text-black hover:bg-amber-500"
      >
        Search
      </button>

      <div className="mt-3">
        <POIResults results={results} loading={loading} error={error} favoriteIds={favoriteIds} onSelect={onSelectResult} />
      </div>

      {categories.length === 0 && (
        <p className="mt-2 text-[11px] text-amber-400">Select at least one category above to search.</p>
      )}
      {categories.length === ALL_CATEGORIES.length && (
        <p className="mt-2 text-[11px] text-neutral-600">Showing all categories — this can return a lot of results.</p>
      )}
    </div>
  );
}
