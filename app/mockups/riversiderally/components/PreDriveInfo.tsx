"use client";

import { X, Cloud, AlertTriangle, Sun } from "lucide-react";
import type { RegionConfig } from "@/lib/rally-core/region";

interface PreDriveInfoProps {
  scoutingDate: string;
  region: RegionConfig;
  sunsetNote?: string;
  checklistItems?: string[];
  onClose: () => void;
}

export default function PreDriveInfo({ scoutingDate, region, sunsetNote, checklistItems, onClose }: PreDriveInfoProps) {
  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/60 md:items-center">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-neutral-900 p-4 shadow-2xl md:rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Pre-drive checklist</h3>
          <button onClick={onClose} className="rounded-full p-1 text-neutral-400 hover:bg-neutral-800">
            <X size={18} />
          </button>
        </div>
        <p className="mt-1 text-sm text-neutral-400">
          Scheduled scouting date: {scoutingDate} ({region.timezone})
        </p>

        <div className="mt-4 space-y-3 text-sm">
          <a
            href={region.weatherUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-2.5 text-white hover:bg-neutral-700"
          >
            <Cloud size={16} className="text-amber-400" /> Check {region.name} weather (NWS)
          </a>
          <a
            href={region.roadConditionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-2.5 text-white hover:bg-neutral-700"
          >
            <AlertTriangle size={16} className="text-amber-400" /> {region.roadConditionsLabel}
          </a>
          {sunsetNote && (
            <div className="flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-2.5 text-white">
              <Sun size={16} className="text-amber-400" />
              {sunsetNote}
            </div>
          )}
        </div>

        {checklistItems && checklistItems.length > 0 && (
          <ul className="mt-4 space-y-2 text-sm text-neutral-300">
            {checklistItems.map((item) => (
              <ChecklistItem key={item}>{item}</ChecklistItem>
            ))}
          </ul>
        )}
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
