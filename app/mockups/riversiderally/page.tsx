"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Destination, LatLng, RallyState, ScoutingNote } from "@/lib/riversiderally/types";
import {
  loadRallyState,
  saveRallyState,
  resetRallyState,
  loadScoutingNotes,
  saveScoutingNotes,
  buildScoutingExport,
  importScoutingExport,
  downloadJson,
  triggerDownload,
} from "@/lib/riversiderally/storage";
import { fetchDrivingRoute, RoutingError, type RouteResult } from "@/lib/riversiderally/routing";
import { routeToGeoJson, routeToGpx } from "@/lib/riversiderally/geoExport";
import TopBar from "./components/TopBar";
import ItinerarySidebar from "./components/ItinerarySidebar";
import DestinationDrawer from "./components/DestinationDrawer";
import ScoutingNoteModal from "./components/ScoutingNoteModal";
import PreDriveInfo from "./components/PreDriveInfo";
import ScoutingModeBar from "./components/ScoutingModeBar";
import AddDestinationModal from "./components/AddDestinationModal";

const RallyMap = dynamic(() => import("./components/RallyMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-neutral-950 text-neutral-500">Loading map…</div>
  ),
});

export default function RiversideRallyPage() {
  const [state, setState] = useState<RallyState | null>(null);
  const [notes, setNotes] = useState<ScoutingNote[]>([]);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteModalDestId, setNoteModalDestId] = useState<string | null>(null);
  const [showPreDrive, setShowPreDrive] = useState(false);
  const [showAddDestination, setShowAddDestination] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [scoutingMode, setScoutingMode] = useState(false);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [flyToTarget, setFlyToTarget] = useState<LatLng | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Load persisted state on mount (client only).
  useEffect(() => {
    setState(loadRallyState());
    setNotes(loadScoutingNotes());
  }, []);

  useEffect(() => {
    if (state) saveRallyState(state);
  }, [state]);

  useEffect(() => {
    saveScoutingNotes(notes);
  }, [notes]);

  const activeDestinations = useMemo(() => state?.destinations.filter((d) => !d.excluded) ?? [], [state]);

  // Recalculate the route whenever the active waypoint sequence changes.
  useEffect(() => {
    if (activeDestinations.length < 2) {
      setRouteResult(null);
      setRouteError(null);
      return;
    }
    let cancelled = false;
    setRouteLoading(true);
    fetchDrivingRoute(activeDestinations)
      .then((result) => {
        if (!cancelled) {
          setRouteResult(result);
          setRouteError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRouteError(err instanceof RoutingError ? err.message : "Unexpected routing error.");
          // Keep whatever route we had before so edits aren't lost, but mark it stale by clearing
          // distance/time context — the map still falls back to straight lines via routeError.
        }
      })
      .finally(() => {
        if (!cancelled) setRouteLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(activeDestinations.map((d) => [d.id, d.position.lat, d.position.lon]))]);

  const selectedDestination = state?.destinations.find((d) => d.id === selectedId) ?? null;
  const noteModalDestination = state?.destinations.find((d) => d.id === noteModalDestId) ?? null;

  const scoutableStops = useMemo(
    () => activeDestinations.filter((d) => d.role === "destination"),
    [activeDestinations],
  );

  // Scouting mode: watch GPS while active.
  useEffect(() => {
    if (!scoutingMode || typeof navigator === "undefined" || !navigator.geolocation) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocationError(null);
      },
      (err) => {
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied — enable it to track your position."
            : "Location unavailable right now (GPS can be imprecise or interrupted while backgrounded).",
        );
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    );
    watchIdRef.current = id;
    return () => {
      navigator.geolocation.clearWatch(id);
      watchIdRef.current = null;
    };
  }, [scoutingMode]);

  const handleCenterOnMe = useCallback(() => {
    if (userLocation) setFlyToTarget({ ...userLocation });
    else setLocationError("No location fix yet — make sure location access is allowed.");
  }, [userLocation]);

  if (!state) {
    return <div className="flex h-dvh items-center justify-center bg-neutral-950 text-neutral-500">Loading Riverside Rally…</div>;
  }

  function updateState(updater: (prev: RallyState) => RallyState) {
    setState((prev) => (prev ? updater(prev) : prev));
  }

  function handleMarkVisited(id: string) {
    updateState((prev) => ({ ...prev, visited: { ...prev.visited, [id]: !prev.visited[id] } }));
  }

  function handleReorder(destinations: Destination[]) {
    updateState((prev) => ({ ...prev, destinations }));
  }

  function handleToggleOptional(id: string) {
    updateState((prev) => ({
      ...prev,
      destinations: prev.destinations.map((d) => (d.id === id ? { ...d, excluded: !d.excluded } : d)),
    }));
  }

  function handleRemove(id: string) {
    updateState((prev) => ({ ...prev, destinations: prev.destinations.filter((d) => d.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  }

  function handleAddDestination(dest: Destination) {
    updateState((prev) => ({ ...prev, destinations: [...prev.destinations, dest] }));
    setShowAddDestination(false);
  }

  function handleRename(name: string) {
    updateState((prev) => ({ ...prev, eventName: name }));
  }

  function handleRestore() {
    if (!window.confirm("Restore the original James River Run route? This replaces your current itinerary edits.")) return;
    const fresh = resetRallyState();
    setState(fresh);
  }

  function handleSaveNote(note: ScoutingNote) {
    setNotes((prev) => [...prev, note]);
    setNoteModalDestId(null);
  }

  function handleExportGeoJson() {
    const geo = routeToGeoJson(state!.destinations, routeResult?.coordinates ?? null);
    downloadJson(`${slug(state!.eventName)}-route.geojson`, geo);
  }

  function handleExportGpx() {
    const gpx = routeToGpx(state!.eventName, state!.destinations, routeResult?.coordinates ?? null);
    triggerDownload(`${slug(state!.eventName)}-route.gpx`, new Blob([gpx], { type: "application/gpx+xml" }));
  }

  function handleExportScoutingJson() {
    downloadJson(`${slug(state!.eventName)}-scouting-report.json`, buildScoutingExport(state!, notes));
  }

  function handleImportScoutingJson(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = importScoutingExport(String(reader.result));
        setState({ eventName: imported.eventName, scoutingDate: state!.scoutingDate, destinations: imported.destinations, visited: imported.visited });
        setNotes(imported.notes);
        window.alert("Scouting data imported.");
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Could not import that file.");
      }
    };
    reader.readAsText(file);
  }

  function handleResetScouting() {
    if (!window.confirm("Clear all visited statuses and scouting notes? Photos and the route itself are kept.")) return;
    updateState((prev) => ({ ...prev, visited: {} }));
    setNotes([]);
  }

  const legDurations = routeResult?.legs.map((l) => l.durationSeconds) ?? null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-neutral-950 text-white">
      <TopBar
        eventName={state.eventName}
        scoutingDate={state.scoutingDate}
        totalDistanceMeters={routeResult?.distanceMeters ?? null}
        totalDurationSeconds={routeResult?.durationSeconds ?? null}
        scoutingMode={scoutingMode}
        onToggleScouting={() => setScoutingMode((v) => !v)}
        onOpenPreDrive={() => setShowPreDrive(true)}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onExportGeoJson={handleExportGeoJson}
        onExportGpx={handleExportGpx}
        onExportScoutingJson={handleExportScoutingJson}
        onImportScoutingJson={handleImportScoutingJson}
        onResetScouting={handleResetScouting}
      />

      <div className="relative flex min-h-0 flex-1">
        <div
          className={`absolute inset-y-0 left-0 z-[950] w-72 transform transition-transform md:static md:w-72 md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <ItinerarySidebar
            state={state}
            onReorder={handleReorder}
            onToggleOptional={handleToggleOptional}
            onRemove={handleRemove}
            onSelect={(id) => {
              setSelectedId(id);
              setSidebarOpen(false);
            }}
            onRename={handleRename}
            onRestore={handleRestore}
            onAddDestination={() => setShowAddDestination(true)}
            totalDistanceMeters={routeResult?.distanceMeters ?? null}
            totalDurationSeconds={routeResult?.durationSeconds ?? null}
            legDurations={legDurations}
          />
        </div>
        {sidebarOpen && (
          <div className="absolute inset-0 z-[940] bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <div className="relative flex-1">
          <RallyMap
            destinations={activeDestinations}
            routeCoordinates={routeResult?.coordinates ?? null}
            routeError={routeError}
            visited={state.visited}
            currentDestinationId={scoutingMode ? (scoutableStops.find((s) => !state.visited[s.id])?.id ?? null) : null}
            onSelectDestination={setSelectedId}
            userLocation={userLocation}
            flyToTarget={flyToTarget}
          />

          {routeLoading && (
            <div className="pointer-events-none absolute left-1/2 top-3 z-[900] -translate-x-1/2 rounded-full bg-neutral-900/90 px-3 py-1 text-xs text-neutral-300 shadow">
              Calculating road-following route…
            </div>
          )}

          {scoutingMode && (
            <ScoutingModeBar
              stops={scoutableStops}
              visited={state.visited}
              userLocation={userLocation}
              locationError={locationError}
              onCenterOnMe={handleCenterOnMe}
            />
          )}

          <DestinationDrawer
            destination={selectedDestination}
            visited={!!(selectedDestination && state.visited[selectedDestination.id])}
            onClose={() => setSelectedId(null)}
            onMarkVisited={handleMarkVisited}
            onAddNote={(id) => setNoteModalDestId(id)}
          />
        </div>
      </div>

      {noteModalDestination && (
        <ScoutingNoteModal destination={noteModalDestination} onClose={() => setNoteModalDestId(null)} onSave={handleSaveNote} />
      )}
      {showPreDrive && <PreDriveInfo scoutingDate={state.scoutingDate} onClose={() => setShowPreDrive(false)} />}
      {showAddDestination && (
        <AddDestinationModal onClose={() => setShowAddDestination(false)} onAdd={handleAddDestination} />
      )}
    </div>
  );
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
