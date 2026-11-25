"use client";

import { Navigation, MapPin, LocateFixed } from "lucide-react";
import type { Destination } from "@/lib/riversiderally/types";
import { googleMapsDirectionsUrl } from "@/lib/riversiderally/googleMaps";
import { haversineMeters, metersToMiles } from "@/lib/riversiderally/routing";

interface ScoutingModeBarProps {
  stops: Destination[];
  visited: Record<string, boolean>;
  userLocation: { lat: number; lon: number } | null;
  locationError: string | null;
  onCenterOnMe: () => void;
}

export default function ScoutingModeBar({ stops, visited, userLocation, locationError, onCenterOnMe }: ScoutingModeBarProps) {
  const nextIndex = stops.findIndex((s) => !visited[s.id]);
  const current = nextIndex > 0 ? stops[nextIndex - 1] : null;
  const next = nextIndex >= 0 ? stops[nextIndex] : null;
  const completedCount = stops.filter((s) => visited[s.id]).length;

  const distanceToNext =
    userLocation && next ? metersToMiles(haversineMeters(userLocation, next.position)) : null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[57px] z-[900] flex flex-col gap-2 p-2 md:top-[65px] md:left-[260px]">
      <div className="pointer-events-auto rounded-xl border border-amber-500/20 bg-neutral-900/95 p-3 shadow-xl backdrop-blur">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span>
            Checkpoint {Math.min(completedCount + 1, stops.length)} of {stops.length}
          </span>
          <button onClick={onCenterOnMe} className="flex items-center gap-1 text-amber-400 hover:underline">
            <LocateFixed size={13} /> Center on me
          </button>
        </div>

        {current && (
          <p className="mt-1 text-xs text-green-400">Last visited: {current.name}</p>
        )}

        {next ? (
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">Next: {next.name}</p>
              <p className="text-xs text-neutral-500">
                {distanceToNext != null ? `${distanceToNext.toFixed(1)} mi away (straight-line estimate)` : "Distance unavailable"}
              </p>
            </div>
            <a
              href={googleMapsDirectionsUrl(next, current ?? undefined)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-black hover:bg-amber-500"
            >
              <Navigation size={15} /> Navigate
            </a>
          </div>
        ) : (
          <p className="mt-1.5 text-sm font-semibold text-green-400">All checkpoints visited — great run!</p>
        )}

        {locationError && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-400">
            <MapPin size={12} /> {locationError}
          </p>
        )}
        <p className="mt-2 text-[11px] text-neutral-600">
          This map is for planning and checkpoint tracking, not turn-by-turn navigation. Pull over before interacting
          with your phone — use Navigate to hand off to Google Maps for driving directions.
        </p>
      </div>
    </div>
  );
}
