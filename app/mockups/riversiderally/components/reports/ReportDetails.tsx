"use client";

import { X, ThumbsUp, ThumbsDown } from "lucide-react";
import { REPORT_TYPE_LABELS, freshnessLabel, type RoadReport } from "@/lib/reports/report-schema";

export default function ReportDetails({
  report,
  onClose,
  onConfirm,
}: {
  report: RoadReport;
  onClose: () => void;
  onConfirm: (stillThere: boolean) => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[1080] rounded-t-2xl border-t border-neutral-800 bg-neutral-900/98 p-4 shadow-2xl backdrop-blur md:absolute md:inset-auto md:left-4 md:top-20 md:w-80 md:rounded-2xl md:border">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">{REPORT_TYPE_LABELS[report.reportType]}</h3>
          <p className="text-xs text-neutral-500">{freshnessLabel(report)}</p>
        </div>
        <button onClick={onClose} className="rounded-full p-1 text-neutral-400 hover:bg-neutral-800">
          <X size={16} />
        </button>
      </div>

      {report.scope === "local" && (
        <p className="mt-2 rounded-md bg-neutral-800 px-2.5 py-1.5 text-xs text-neutral-400">Local-only report — not shared with other users.</p>
      )}

      {report.roadLabel && <p className="mt-2 text-sm text-neutral-300">Road: {report.roadLabel}</p>}
      {report.direction && report.direction !== "unspecified" && (
        <p className="text-sm capitalize text-neutral-300">Direction: {report.direction}</p>
      )}
      {report.description && <p className="mt-1 text-sm text-neutral-300">{report.description}</p>}

      <p className="mt-2 text-xs text-neutral-500">
        Confirmed {report.confirmCount}x · Reported gone {report.dismissCount}x
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => onConfirm(true)}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-green-600/20 px-3 py-2 text-sm font-medium text-green-400 hover:bg-green-600/30"
        >
          <ThumbsUp size={15} /> Still There
        </button>
        <button
          onClick={() => onConfirm(false)}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-neutral-800 px-3 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-700"
        >
          <ThumbsDown size={15} /> No Longer There
        </button>
      </div>
    </div>
  );
}
