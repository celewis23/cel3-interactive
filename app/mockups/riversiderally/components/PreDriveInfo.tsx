"use client";

import { X, Cloud, AlertTriangle, Sun } from "lucide-react";
import { RICHMOND_SUNSET_NOV_25_2026 } from "@/lib/riversiderally/seed";

export default function PreDriveInfo({ scoutingDate, onClose }: { scoutingDate: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/60 md:items-center">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-neutral-900 p-4 shadow-2xl md:rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Pre-drive checklist</h3>
          <button onClick={onClose} className="rounded-full p-1 text-neutral-400 hover:bg-neutral-800">
            <X size={18} />
          </button>
        </div>
        <p className="mt-1 text-sm text-neutral-400">Scheduled scouting date: {scoutingDate} (America/New_York)</p>

        <div className="mt-4 space-y-3 text-sm">
          <a
            href="https://forecast.weather.gov/MapClick.php?lat=37.5407&lon=-77.4360"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-2.5 text-white hover:bg-neutral-700"
          >
            <Cloud size={16} className="text-amber-400" /> Check Richmond-area weather (NWS)
          </a>
          <a
            href="https://511virginia.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-2.5 text-white hover:bg-neutral-700"
          >
            <AlertTriangle size={16} className="text-amber-400" /> Virginia 511 traffic &amp; incidents
          </a>
          <div className="flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-2.5 text-white">
            <Sun size={16} className="text-amber-400" />
            Sunset Nov 25, 2026: {RICHMOND_SUNSET_NOV_25_2026}. Plan to be off scenic roads before dark.
          </div>
        </div>

        <ul className="mt-4 space-y-2 text-sm text-neutral-300">
          <ChecklistItem>Confirm Southern Kitchen's holiday hours before counting on it as the dining stop.</ChecklistItem>
          <ChecklistItem>Confirm Tucker Park's access/hours and whether a permit is needed for a group visit.</ChecklistItem>
          <ChecklistItem>Confirm Stony Point Fashion Park's policy on using their lot as a gathering point.</ChecklistItem>
          <ChecklistItem>None of the above are live-verified by this app — confirm them yourself before the drive.</ChecklistItem>
        </ul>
      </div>
    </div>
  );
}

function ChecklistItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="mt-0.5 text-amber-500">□</span>
      {children}
    </li>
  );
}
