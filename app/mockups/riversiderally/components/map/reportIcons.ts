import L from "leaflet";
import type { ReportType } from "@/lib/reports/report-schema";

const REPORT_GLYPH: Record<ReportType, { glyph: string; color: string }> = {
  police: { glyph: "👮", color: "#3b82f6" },
  accident: { glyph: "💥", color: "#ef4444" },
  obstruction: { glyph: "🚧", color: "#f97316" },
  debris: { glyph: "🪨", color: "#f97316" },
  construction: { glyph: "🏗", color: "#eab308" },
  "road-closure": { glyph: "⛔", color: "#ef4444" },
  "disabled-vehicle": { glyph: "🚗", color: "#f97316" },
  hazard: { glyph: "⚠️", color: "#f97316" },
  other: { glyph: "❗", color: "#a78bfa" },
};

export function reportDivIcon(type: ReportType, isLocal: boolean): L.DivIcon {
  const { glyph, color } = REPORT_GLYPH[type];
  return L.divIcon({
    className: "rr-report-marker",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:${color};border:2px solid #0a0a0a;font-size:14px;box-shadow:0 1px 3px rgba(0,0,0,0.6);${isLocal ? "opacity:0.75;border-style:dashed;" : ""}">${glyph}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}
