"use client";

import { useState } from "react";
import { X, TriangleAlert } from "lucide-react";
import { REPORT_TYPE_LABELS, type ReportType, type RoadReport } from "@/lib/reports/report-schema";
import type { LatLng } from "@/lib/riversiderally/types";

const REPORT_TYPES = Object.keys(REPORT_TYPE_LABELS) as ReportType[];
const DIRECTIONS: NonNullable<RoadReport["direction"]>[] = ["northbound", "southbound", "eastbound", "westbound", "unspecified"];

export default function ReportForm({
  position,
  onCancel,
  onSubmit,
}: {
  position: LatLng;
  onCancel: () => void;
  onSubmit: (input: {
    reportType: ReportType;
    roadLabel: string;
    direction: RoadReport["direction"];
    description: string;
    keepLocalOnly: boolean;
  }) => void;
}) {
  const [reportType, setReportType] = useState<ReportType>("hazard");
  const [roadLabel, setRoadLabel] = useState("");
  const [direction, setDirection] = useState<RoadReport["direction"]>("unspecified");
  const [description, setDescription] = useState("");
  const [keepLocalOnly, setKeepLocalOnly] = useState(false);

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/60 md:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-neutral-900 p-4 shadow-2xl md:rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Create a road report</h3>
          <button onClick={onCancel} className="rounded-full p-1 text-neutral-400 hover:bg-neutral-800">
            <X size={18} />
          </button>
        </div>

        <p className="mt-2 flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          Only submit this while safely parked. Never operate this form while driving. Police observations are
          user-submitted awareness reports, not verified real-time tracking — don&apos;t use them to evade enforcement
          or confront anyone.
        </p>

        <div className="mt-3 space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-neutral-400">Report type</p>
            <div className="grid grid-cols-2 gap-1.5">
              {REPORT_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setReportType(t)}
                  className={`rounded-lg px-2.5 py-2 text-left text-xs ${
                    reportType === t ? "bg-amber-500 text-black" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                  }`}
                >
                  {REPORT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-neutral-400">Pin location</p>
            <p className="rounded-lg bg-neutral-800 px-3 py-2 text-xs text-neutral-400">
              {position.lat.toFixed(5)}, {position.lon.toFixed(5)} — long-press or tap the map again before submitting to adjust.
            </p>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-neutral-400">Road (optional)</p>
            <input
              value={roadLabel}
              onChange={(e) => setRoadLabel(e.target.value)}
              placeholder="e.g. Huguenot Trail / Route 711"
              className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-500"
            />
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-neutral-400">Travel direction (optional)</p>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as RoadReport["direction"])}
              className="w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white capitalize"
            >
              {DIRECTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-neutral-400">Description (optional, 280 chars)</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 280))}
              rows={2}
              className="w-full rounded-lg bg-neutral-800 p-2.5 text-sm text-white placeholder:text-neutral-500"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={keepLocalOnly}
              onChange={(e) => setKeepLocalOnly(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-700 bg-neutral-800 accent-amber-500"
            />
            Keep this report on this device only (don&apos;t share it with other users)
          </label>
        </div>

        <button
          onClick={() => onSubmit({ reportType, roadLabel, direction, description, keepLocalOnly })}
          className="mt-4 w-full rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-black hover:bg-amber-500"
        >
          Submit report
        </button>
      </div>
    </div>
  );
}
