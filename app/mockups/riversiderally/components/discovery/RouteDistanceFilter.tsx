"use client";

import type { SearchMode } from "@/lib/places/poi-search";

const SEARCH_MODES: { value: SearchMode; label: string }[] = [
  { value: "near-me", label: "Near Me" },
  { value: "along-route", label: "Along Entire Route" },
  { value: "near-next-checkpoint", label: "Near Next Checkpoint" },
  { value: "near-stop", label: "Near Selected Stop" },
  { value: "visible-area", label: "Search Visible Map Area" },
];

const DISTANCES = [1, 3, 5, 10];

export default function RouteDistanceFilter({
  mode,
  onModeChange,
  maxDistanceMiles,
  onDistanceChange,
}: {
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  maxDistanceMiles: number;
  onDistanceChange: (miles: number) => void;
}) {
  return (
    <div className="space-y-2">
      <select
        value={mode}
        onChange={(e) => onModeChange(e.target.value as SearchMode)}
        className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white"
      >
        {SEARCH_MODES.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      {mode !== "visible-area" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Max off-route distance:</span>
          <div className="flex gap-1">
            {DISTANCES.map((d) => (
              <button
                key={d}
                onClick={() => onDistanceChange(d)}
                className={`rounded-md px-2 py-1 text-xs ${
                  maxDistanceMiles === d ? "bg-amber-500 text-black" : "bg-neutral-800 text-neutral-400"
                }`}
              >
                {d} mi
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
