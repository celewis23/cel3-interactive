"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { Destination, LatLng } from "@/lib/riversiderally/types";

// Leaflet's default marker icons reference image files that don't resolve correctly through
// Next.js's bundler. Point them at the CDN build that ships with the installed leaflet version.
const DEFAULT_ICON = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

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

interface RallyMapProps {
  destinations: Destination[];
  routeCoordinates: LatLng[] | null;
  routeError: string | null;
  visited: Record<string, boolean>;
  currentDestinationId: string | null;
  onSelectDestination: (id: string) => void;
  userLocation: LatLng | null;
  flyToTarget: LatLng | null;
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
      center={[37.6, -77.75]}
      zoom={10}
      scrollWheelZoom
      className="h-full w-full"
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

      <FitToRoute points={fitPoints} />
      <FlyToLocation target={flyToTarget} />

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
