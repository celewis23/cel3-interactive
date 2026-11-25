"use client";

import { TriangleAlert } from "lucide-react";

export default function ReportButton({ placing, onStart, onCancel }: { placing: boolean; onStart: () => void; onCancel: () => void }) {
  if (placing) {
    return (
      <div className="absolute left-1/2 top-16 z-[950] -translate-x-1/2 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-black shadow-lg">
        Tap the map to place your report
        <button onClick={onCancel} className="ml-3 underline">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onStart}
      className="absolute bottom-24 right-4 z-[900] flex items-center gap-2 rounded-full bg-neutral-900/95 px-4 py-2.5 text-sm font-semibold text-red-300 shadow-lg ring-1 ring-red-500/30 hover:bg-neutral-800 md:bottom-4"
    >
      <TriangleAlert size={16} /> Report
    </button>
  );
}
