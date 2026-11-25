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
import { getActiveEvent } from "@/lib/rally-core/events";
import type { BoundingBox, Poi, PoiCategory } from "@/lib/places/types";
import type { PoiWithDistance } from "@/lib/places/route-proximity";
import { PoiSearchError, searchPois, type SearchMode } from "@/lib/places/poi-search";
import { loadFavorites, toggleFavorite } from "@/lib/places/favorites";
import type { ReportType, RoadReport } from "@/lib/reports/report-schema";
import {
  createLocalReport,
  confirmLocalReport,
  removeExpiredLocalReports,
  fetchSharedReports,
  createSharedReport,
  confirmSharedReport,
} from "@/lib/reports/report-repository";
import TopBar from "./components/TopBar";
import ItinerarySidebar from "./components/ItinerarySidebar";
import DestinationDrawer from "./components/DestinationDrawer";
import ScoutingNoteModal from "./components/ScoutingNoteModal";
import PreDriveInfo from "./components/PreDriveInfo";
import ScoutingModeBar from "./components/ScoutingModeBar";
import AddDestinationModal from "./components/AddDestinationModal";
import DiscoverPanel from "./components/discovery/DiscoverPanel";
import POIDetailSheet from "./components/map/POIDetailSheet";
import ReportButton from "./components/reports/ReportButton";
import ReportForm from "./components/reports/ReportForm";
import ReportDetails from "./components/reports/ReportDetails";
import ReportConfirmation from "./components/reports/ReportConfirmation";

const RallyMap = dynamic(() => import("./components/RallyMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-neutral-950 text-neutral-500">Loading map…</div>
  ),
});

const DEFAULT_POI_CATEGORIES: PoiCategory[] = ["gas", "food", "coffee"];

export default function RiversideRallyPage() {
  // Only one event is configured today, but every persistence call below is namespaced by
  // its id so a second event's data never bleeds into this one.
  const activeEvent = getActiveEvent();

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

  // ---- POI discovery ----
  const [mapBounds, setMapBounds] = useState<BoundingBox | null>(null);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [poiCategories, setPoiCategories] = useState<PoiCategory[]>(DEFAULT_POI_CATEGORIES);
  const [searchMode, setSearchMode] = useState<SearchMode>("along-route");
  const [maxOffRouteMiles, setMaxOffRouteMiles] = useState(3);
  const [poiResults, setPoiResults] = useState<PoiWithDistance[]>([]);
  const [poiLoading, setPoiLoading] = useState(false);
  const [poiError, setPoiError] = useState<string | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<PoiWithDistance | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // ---- Community road reports ----
  const [reports, setReports] = useState<RoadReport[]>([]);
  const [showReports, setShowReports] = useState(true);
  const [selectedReport, setSelectedReport] = useState<RoadReport | null>(null);
  const [placingReport, setPlacingReport] = useState(false);
  const [draftReportPosition, setDraftReportPosition] = useState<LatLng | null>(null);
  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [reportConfirmation, setReportConfirmation] = useState<{ sharedWithCommunity: boolean } | null>(null);
  const mapBoundsRef = useRef<BoundingBox | null>(null);

  // Load persisted state on mount (client only).
  useEffect(() => {
    setState(loadRallyState(activeEvent.id));
    setNotes(loadScoutingNotes(activeEvent.id));
    setFavoriteIds(new Set(loadFavorites().map((f) => f.poi.id)));
    setReports(removeExpiredLocalReports());
  }, []);

  useEffect(() => {
    if (state) saveRallyState(activeEvent.id, state);
  }, [state]);

  useEffect(() => {
    saveScoutingNotes(activeEvent.id, notes);
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
  const nextCheckpoint = scoutableStops.find((s) => state && !state.visited[s.id]) ?? null;

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

  // Keep a ref of the latest map bounds for the polling loop below (avoids resetting the
  // interval every time the user pans/zooms).
  useEffect(() => {
    mapBoundsRef.current = mapBounds;
  }, [mapBounds]);

  // Poll shared road reports (and sweep expired local ones) roughly every 25s while visible.
  // This is poll-based sync against the shared production database, not a websocket/Realtime
  // feed — reports are genuinely shared across users, just not instantaneous.
  useEffect(() => {
    if (!showReports) return;

    async function refresh() {
      const bbox = mapBoundsRef.current;
      const local = removeExpiredLocalReports();
      if (!bbox) {
        setReports(local);
        return;
      }
      try {
        const shared = await fetchSharedReports(bbox);
        setReports([...local, ...shared]);
      } catch {
        setReports(local);
      }
    }

    refresh();
    const interval = setInterval(refresh, 25000);
    return () => clearInterval(interval);
  }, [showReports, mapBounds]);

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
    const fresh = resetRallyState(activeEvent.id);
    setState(fresh);
  }

  function handleSaveNote(note: ScoutingNote) {
    setNotes((prev) => [...prev, { ...note, eventId: activeEvent.id }]);
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
        setState({
          eventId: activeEvent.id,
          eventName: imported.eventName,
          scoutingDate: state!.scoutingDate,
          destinations: imported.destinations,
          visited: imported.visited,
        });
        setNotes(imported.notes.map((n) => ({ ...n, eventId: activeEvent.id })));
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

  // ---- POI discovery handlers ----
  async function handleRunPoiSearch() {
    if (poiCategories.length === 0) {
      setPoiError("Select at least one category first.");
      return;
    }
    setPoiLoading(true);
    setPoiError(null);
    try {
      const results = await searchPois({
        mode: searchMode,
        categories: poiCategories,
        maxOffRouteMiles,
        routeCoordinates: routeResult?.coordinates ?? null,
        userLocation,
        selectedStopPosition: selectedDestination?.position ?? null,
        nextCheckpointPosition: nextCheckpoint?.position ?? null,
        visibleBounds: mapBounds,
      });
      setPoiResults(results);
    } catch (err) {
      setPoiError(err instanceof PoiSearchError ? err.message : "Could not search for places.");
      setPoiResults([]);
    } finally {
      setPoiLoading(false);
    }
  }

  function handleSelectPoi(poi: PoiWithDistance) {
    setSelectedPoi(poi);
    setSelectedId(null);
    setSelectedReport(null);
  }

  function handleToggleFavoritePoi(poi: Poi) {
    const next = toggleFavorite(poi);
    setFavoriteIds(new Set(next.map((f) => f.poi.id)));
  }

  function handleAddPoiToRally(poi: PoiWithDistance) {
    const newDestination: Destination = {
      id: `poi-${poi.id}`,
      name: poi.name,
      role: "destination",
      category: "optional",
      position: poi.position,
      address: poi.address,
      description: `Added from Discover (${poi.category.replace("-", " ")}).`,
      plannedStopMinutes: 15,
      optional: true,
      coordinatesVerified: true, // OSM-sourced coordinates for a real indexed place, not geocoded guesswork
      roadAccessNotes: "Not yet verified",
      parkingObservations: "Not yet verified",
    };
    updateState((prev) => ({ ...prev, destinations: [...prev.destinations, newDestination] }));
  }

  // ---- Road report handlers ----
  function handleMapLongPress(latlng: LatLng) {
    setDraftReportPosition(latlng);
    setPlacingReport(false);
    setReportFormOpen(true);
  }

  function handleMapClickForReport(latlng: LatLng) {
    setDraftReportPosition(latlng);
    setPlacingReport(false);
    setReportFormOpen(true);
  }

  async function handleSubmitReport(input: {
    reportType: ReportType;
    roadLabel: string;
    direction: RoadReport["direction"];
    description: string;
    keepLocalOnly: boolean;
  }) {
    if (!draftReportPosition) return;
    const base = {
      reportType: input.reportType,
      position: draftReportPosition,
      roadLabel: input.roadLabel || undefined,
      direction: input.direction,
      description: input.description || undefined,
    };
    try {
      if (input.keepLocalOnly) {
        createLocalReport(base);
        setReports(removeExpiredLocalReports().concat(reports.filter((r) => r.scope === "shared")));
      } else {
        const created = await createSharedReport(base);
        setReports((prev) => [...prev, created]);
      }
      setReportFormOpen(false);
      setDraftReportPosition(null);
      setReportConfirmation({ sharedWithCommunity: !input.keepLocalOnly });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not submit report.");
    }
  }

  async function handleConfirmReport(stillThere: boolean) {
    if (!selectedReport) return;
    if (selectedReport.scope === "local") {
      const updated = confirmLocalReport(selectedReport.id, stillThere);
      setReports((prev) => [...prev.filter((r) => r.scope !== "local"), ...updated]);
      const refreshed = updated.find((r) => r.id === selectedReport.id) ?? null;
      setSelectedReport(refreshed && refreshed.status === "active" ? refreshed : null);
    } else {
      try {
        const updated = await confirmSharedReport(selectedReport.id, stillThere);
        setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        setSelectedReport(updated.status === "active" ? updated : null);
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Could not update report.");
      }
    }
  }

  const visibleReports = reports.filter((r) => r.status === "active");
  const poiInRallyIds = new Set(state.destinations.filter((d) => d.id.startsWith("poi-")).map((d) => d.id.replace(/^poi-/, "")));

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
            subtitle={activeEvent.routeDescription}
            onReorder={handleReorder}
            onToggleOptional={handleToggleOptional}
            onRemove={handleRemove}
            onSelect={(id) => {
              setSelectedId(id);
              setSelectedPoi(null);
              setSelectedReport(null);
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
            currentDestinationId={scoutingMode ? (nextCheckpoint?.id ?? null) : null}
            onSelectDestination={(id) => {
              setSelectedId(id);
              setSelectedPoi(null);
              setSelectedReport(null);
            }}
            userLocation={userLocation}
            flyToTarget={flyToTarget}
            pois={poiResults}
            favoritePoiIds={favoriteIds}
            onSelectPoi={handleSelectPoi}
            reports={visibleReports}
            showReports={showReports}
            onSelectReport={(report) => {
              setSelectedReport(report);
              setSelectedId(null);
              setSelectedPoi(null);
            }}
            onBoundsChange={setMapBounds}
            onLongPress={handleMapLongPress}
            draftReportPosition={draftReportPosition}
            placingReport={placingReport}
            onMapClick={handleMapClickForReport}
            initialCenter={activeEvent.region.mapCenter}
            initialZoom={activeEvent.region.defaultZoom}
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

          <DiscoverPanel
            open={discoverOpen}
            onOpenChange={setDiscoverOpen}
            categories={poiCategories}
            onCategoriesChange={setPoiCategories}
            mode={searchMode}
            onModeChange={setSearchMode}
            maxDistanceMiles={maxOffRouteMiles}
            onDistanceChange={setMaxOffRouteMiles}
            onRunSearch={handleRunPoiSearch}
            results={poiResults}
            loading={poiLoading}
            error={poiError}
            favoriteIds={favoriteIds}
            onSelectResult={handleSelectPoi}
          />

          <button
            onClick={() => setShowReports((v) => !v)}
            className={`absolute left-4 top-3 z-[900] rounded-full px-3 py-1.5 text-xs font-medium shadow ${
              showReports ? "bg-neutral-900/90 text-neutral-300" : "bg-neutral-800/60 text-neutral-500"
            }`}
          >
            {showReports ? "Hide road reports" : "Show road reports"}
          </button>

          <ReportButton placing={placingReport} onStart={() => setPlacingReport(true)} onCancel={() => setPlacingReport(false)} />

          <DestinationDrawer
            destination={selectedDestination}
            visited={!!(selectedDestination && state.visited[selectedDestination.id])}
            onClose={() => setSelectedId(null)}
            onMarkVisited={handleMarkVisited}
            onAddNote={(id) => setNoteModalDestId(id)}
          />

          {selectedPoi && (
            <POIDetailSheet
              poi={selectedPoi}
              isFavorite={favoriteIds.has(selectedPoi.id)}
              onClose={() => setSelectedPoi(null)}
              onToggleFavorite={() => handleToggleFavoritePoi(selectedPoi)}
              onAddToRally={() => handleAddPoiToRally(selectedPoi)}
              alreadyInRally={poiInRallyIds.has(selectedPoi.id)}
            />
          )}

          {selectedReport && (
            <ReportDetails report={selectedReport} onClose={() => setSelectedReport(null)} onConfirm={handleConfirmReport} />
          )}
        </div>
      </div>

      {noteModalDestination && (
        <ScoutingNoteModal destination={noteModalDestination} onClose={() => setNoteModalDestId(null)} onSave={handleSaveNote} />
      )}
      {showPreDrive && (
        <PreDriveInfo
          scoutingDate={state.scoutingDate}
          region={activeEvent.region}
          sunsetNote={activeEvent.scoutingDateSunsetNote}
          checklistItems={activeEvent.preDriveChecklist}
          onClose={() => setShowPreDrive(false)}
        />
      )}
      {showAddDestination && (
        <AddDestinationModal onClose={() => setShowAddDestination(false)} onAdd={handleAddDestination} />
      )}
      {reportFormOpen && draftReportPosition && (
        <ReportForm position={draftReportPosition} onCancel={() => setReportFormOpen(false)} onSubmit={handleSubmitReport} />
      )}
      {reportConfirmation && (
        <ReportConfirmation sharedWithCommunity={reportConfirmation.sharedWithCommunity} onClose={() => setReportConfirmation(null)} />
      )}
    </div>
  );
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
