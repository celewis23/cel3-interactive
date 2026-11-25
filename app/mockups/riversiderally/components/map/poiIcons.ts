import L from "leaflet";
import type { PoiCategory } from "@/lib/places/types";

const CATEGORY_GLYPH: Record<PoiCategory, { glyph: string; color: string }> = {
  gas: { glyph: "⛽", color: "#f97316" },
  "ev-charging": { glyph: "⚡", color: "#22c55e" },
  food: { glyph: "🍽", color: "#eab308" },
  coffee: { glyph: "☕", color: "#a16207" },
  convenience: { glyph: "🏪", color: "#eab308" },
  mechanic: { glyph: "🔧", color: "#64748b" },
  "tire-shop": { glyph: "🛞", color: "#64748b" },
  towing: { glyph: "🚛", color: "#64748b" },
  "auto-parts": { glyph: "🔩", color: "#64748b" },
  "dealership-service": { glyph: "🚗", color: "#64748b" },
  restroom: { glyph: "🚻", color: "#38bdf8" },
  park: { glyph: "🌳", color: "#22c55e" },
  "scenic-overlook": { glyph: "📷", color: "#38bdf8" },
  parking: { glyph: "🅿️", color: "#38bdf8" },
  "historic-landmark": { glyph: "🏛", color: "#a78bfa" },
  hotel: { glyph: "🛏", color: "#a78bfa" },
};

export function poiDivIcon(category: PoiCategory, favorite: boolean): L.DivIcon {
  const { glyph, color } = CATEGORY_GLYPH[category];
  return L.divIcon({
    className: "rr-poi-marker",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:${color};border:2px solid #0a0a0a;font-size:13px;box-shadow:0 1px 3px rgba(0,0,0,0.5);${favorite ? "outline:2px solid #facc15;" : ""}">${glyph}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
}

export function poiClusterIcon(count: number): L.DivIcon {
  const size = count > 20 ? 38 : count > 8 ? 32 : 26;
  return L.divIcon({
    className: "rr-poi-cluster",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:#1e293b;border:2px solid #475569;color:#e2e8f0;font-size:12px;font-weight:600;">${count}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
