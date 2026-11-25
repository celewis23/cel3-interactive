"use client";

import { useEffect, useState } from "react";
import { Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import type { PoiWithDistance } from "@/lib/places/route-proximity";
import { poiDivIcon, poiClusterIcon } from "./poiIcons";
import { clusterPoints } from "./clusterPoints";
import { POI_CATEGORY_LABELS } from "@/lib/places/types";

interface POILayerProps {
  pois: PoiWithDistance[];
  favoriteIds: Set<string>;
  onSelect: (poi: PoiWithDistance) => void;
}

export default function POILayer({ pois, favoriteIds, onSelect }: POILayerProps) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  });

  useEffect(() => setZoom(map.getZoom()), [map]);

  const clusters = clusterPoints(
    pois.map((p) => ({ id: p.id, position: p.position, poi: p })),
    zoom,
  );

  return (
    <>
      {clusters.map((cluster) => {
        if (cluster.items.length === 1) {
          const poi = cluster.items[0].poi;
          return (
            <Marker
              key={poi.id}
              position={[poi.position.lat, poi.position.lon]}
              icon={poiDivIcon(poi.category, favoriteIds.has(poi.id))}
              eventHandlers={{ click: () => onSelect(poi) }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{poi.name}</p>
                  <p className="text-xs text-neutral-600">{POI_CATEGORY_LABELS[poi.category]}</p>
                  {poi.address && <p className="text-xs text-neutral-600">{poi.address}</p>}
                  <p className="text-xs text-neutral-500">{poi.distanceFromRouteMiles.toFixed(1)} mi from route</p>
                </div>
              </Popup>
            </Marker>
          );
        }
        return (
          <Marker
            key={`cluster-${cluster.position.lat}-${cluster.position.lon}-${cluster.items.length}`}
            position={[cluster.position.lat, cluster.position.lon]}
            icon={poiClusterIcon(cluster.items.length)}
            eventHandlers={{
              click: () => {
                map.flyTo([cluster.position.lat, cluster.position.lon], Math.min(zoom + 2, 18));
              },
            }}
          />
        );
      })}
    </>
  );
}
