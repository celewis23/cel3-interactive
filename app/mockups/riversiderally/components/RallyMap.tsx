"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { Destination, LatLng } from "@/lib/riversiderally/types";
import type { BoundingBox } from "@/lib/places/types";
import type { PoiWithDistance } from "@/lib/places/route-proximity";
import type { RoadReport } from "@/lib/reports/report-schema";
import POILayer from "./map/POILayer";
import RoadReportsLayer from "./map/RoadReportsLayer";

function categoryColor(category: Destination["category"]): string {
  switch (category) {
    case "start-finish":
      return "#f59e0b"; // amber
    case "checkpoint":
      return "#3b82f6"; // blue — scenic markers
    case "dining":
      return "#eab308"; // gold — food markers
    case "optional":
      return "#a78bfa";
    case "scenic-segment":
      return "#60a5fa";
    default:
      return "#9ca3af";
  }
}

function markerIcon(dest: Destination, visited: boolean, isCurrent: boolean): L.DivIcon {
  const color = visited ? "#22c55e" : isCurrent ? "#fb923c" : categoryColor(dest.category);
  const size = isCurrent ? 20 : 16;
  return L.divIcon({
    className: "rr-marker",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2px solid #1c1917;box-shadow:0 0 0 2px rgba(255,255,255,0.4);"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function userLocationIcon(): L.DivIcon {
  return L.divIcon({
    className: "rr-user-marker",
    html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#38bdf8;border:3px solid white;box-shadow:0 0 0 4px rgba(56,189,248,0.35);"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function FitToRoute({ points }: { points: LatLng[] }) {
  const map = useMap();
  const didFit = useRef(false);
  useEffect(() => {
    if (points.length === 0 || didFit.current) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lon] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40] });
    didFit.current = true;
  }, [points, map]);
  return null;
}

export function FlyToLocation({ target }: { target: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lon], Math.max(map.getZoom(), 14));
  }, [target, map]);
  return null;
}

function BoundsWatcher({ onChange }: { onChange: (bbox: BoundingBox) => void }) {
  const map = useMap();

  function report() {
    const b = map.getBounds();
    onChange({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() });
  }

  useMapEvents({
    moveend: report,
    zoomend: report,
  });

  useEffect(() => {
    report();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}

// Long-press (touch) or right-click (desktop) on the map starts a road report at that spot.
function LongPressHandler({ onLongPress }: { onLongPress: (latlng: LatLng) => void }) {
  const map = useMap();

  useMapEvents({
    contextmenu: (e) => onLongPress({ lat: e.latlng.lat, lon: e.latlng.lng }),
  });

  useEffect(() => {
    const container = map.getContainer();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let startPoint: { x: number; y: number } | null = null;
    let longPressLatLng: LatLng | null = null;

    function clear() {
      if (timer) clearTimeout(timer);
      timer = null;
      startPoint = null;
    }

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      startPoint = { x: touch.clientX, y: touch.clientY };
      const point = L.DomEvent.getMousePosition(touch as unknown as MouseEvent, container);
      const latlng = map.containerPointToLatLng(point);
      longPressLatLng = { lat: latlng.lat, lon: latlng.lng };
      timer = setTimeout(() => {
        if (longPressLatLng) onLongPress(longPressLatLng);
      }, 600);
    }

    function handleTouchMove(e: TouchEvent) {
      if (!startPoint || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startPoint.x;
      const dy = touch.clientY - startPoint.y;
      if (Math.sqrt(dx * dx + dy * dy) > 12) clear();
    }

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchend", clear);
    container.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      clear();
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchend", clear);
      container.removeEventListener("touchmove", handleTouchMove);
    };
  }, [map, onLongPress]);

  return null;
}

function ClickHandler({ onClick }: { onClick: (latlng: LatLng) => void }) {
  useMapEvents({
    click: (e) => onClick({ lat: e.latlng.lat, lon: e.latlng.lng }),
  });
  return null;
}

function draftReportIcon(): L.DivIcon {
  return L.divIcon({
    className: "rr-draft-report-marker",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9999px 9999px 9999px 0;transform:rotate(45deg);background:#f59e0b;border:2px solid #0a0a0a;"></span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
}

interface RallyMapProps {
  destinations: Destination[];
  routeCoordinates: LatLng[] | null;
  routeError: string | null;
  visited: Record<string, boolean>;
  currentDestinationId: string | null;
  onSelectDestination: (id: string) => void;
  userLocation: LatLng | null;
  flyToTarget: LatLng | null;
  pois: PoiWithDistance[];
  favoritePoiIds: Set<string>;
  onSelectPoi: (poi: PoiWithDistance) => void;
  reports: RoadReport[];
  showReports: boolean;
  onSelectReport: (report: RoadReport) => void;
  onBoundsChange: (bbox: BoundingBox) => void;
  onLongPress: (latlng: LatLng) => void;
  draftReportPosition: LatLng | null;
  placingReport: boolean;
  onMapClick: (latlng: LatLng) => void;
  initialCenter: LatLng;
  initialZoom: number;
}

export default function RallyMap({
  destinations,
  routeCoordinates,
  routeError,
  visited,
  currentDestinationId,
  onSelectDestination,
  userLocation,
  flyToTarget,
  pois,
  favoritePoiIds,
  onSelectPoi,
  reports,
  showReports,
  onSelectReport,
  onBoundsChange,
  onLongPress,
  draftReportPosition,
  placingReport,
  onMapClick,
  initialCenter,
  initialZoom,
}: RallyMapProps) {
  const stopPoints = useMemo(
    () => destinations.filter((d) => d.role === "destination" || d.optional),
    [destinations],
  );

  const fitPoints = useMemo(() => {
    if (routeCoordinates && routeCoordinates.length > 1) return routeCoordinates;
    return destinations.map((d) => d.position);
  }, [routeCoordinates, destinations]);

  const fallbackLine = useMemo(() => destinations.map((d) => d.position), [destinations]);

  return (
    <MapContainer
      center={[initialCenter.lat, initialCenter.lon]}
      zoom={initialZoom}
      scrollWheelZoom
      className={`h-full w-full ${placingReport ? "cursor-crosshair" : ""}`}
      attributionControl
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {routeCoordinates && routeCoordinates.length > 1 ? (
        <Polyline
          positions={routeCoordinates.map((c) => [c.lat, c.lon])}
          pathOptions={{ color: "#f59e0b", weight: 5, opacity: 0.9 }}
        />
      ) : (
        <Polyline
          positions={fallbackLine.map((c) => [c.lat, c.lon])}
          pathOptions={{ color: "#9ca3af", weight: 3, opacity: 0.7, dashArray: "8 8" }}
        />
      )}

      {stopPoints.map((dest) => (
        <Marker
          key={dest.id}
          position={[dest.position.lat, dest.position.lon]}
          icon={markerIcon(dest, !!visited[dest.id], dest.id === currentDestinationId)}
          eventHandlers={{ click: () => onSelectDestination(dest.id) }}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{dest.name}</p>
              {dest.address && <p className="text-xs text-neutral-600">{dest.address}</p>}
              {!dest.coordinatesVerified && (
                <p className="mt-1 text-xs text-amber-600">Location not yet GPS-verified</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      {userLocation && (
        <Marker position={[userLocation.lat, userLocation.lon]} icon={userLocationIcon()}>
          <Popup>Your current location</Popup>
        </Marker>
      )}

      <POILayer pois={pois} favoriteIds={favoritePoiIds} onSelect={onSelectPoi} />
      {showReports && <RoadReportsLayer reports={reports} onSelect={onSelectReport} />}

      {draftReportPosition && (
        <Marker position={[draftReportPosition.lat, draftReportPosition.lon]} icon={draftReportIcon()} />
      )}

      <FitToRoute points={fitPoints} />
      <FlyToLocation target={flyToTarget} />
      <BoundsWatcher onChange={onBoundsChange} />
      <LongPressHandler onLongPress={onLongPress} />
      {placingReport && <ClickHandler onClick={onMapClick} />}

      {routeError && (
        <div className="leaflet-top leaflet-left" style={{ pointerEvents: "none" }}>
          <div className="leaflet-control m-2 max-w-xs rounded-lg bg-red-950/90 px-3 py-2 text-xs text-red-200 shadow-lg">
            Route unavailable: {routeError}. Showing straight-line waypoints — use Google Maps for real navigation.
          </div>
        </div>
      )}
    </MapContainer>
  );
}
