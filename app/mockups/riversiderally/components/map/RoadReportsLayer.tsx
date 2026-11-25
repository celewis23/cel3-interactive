"use client";

import { Marker } from "react-leaflet";
import type { RoadReport } from "@/lib/reports/report-schema";
import { reportDivIcon } from "./reportIcons";

interface RoadReportsLayerProps {
  reports: RoadReport[];
  onSelect: (report: RoadReport) => void;
}

export default function RoadReportsLayer({ reports, onSelect }: RoadReportsLayerProps) {
  return (
    <>
      {reports.map((report) => (
        <Marker
          key={report.id}
          position={[report.position.lat, report.position.lon]}
          icon={reportDivIcon(report.reportType, report.scope === "local")}
          eventHandlers={{ click: () => onSelect(report) }}
        />
      ))}
    </>
  );
}
