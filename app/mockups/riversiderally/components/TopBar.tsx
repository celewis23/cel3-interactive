"use client";

import { useRef, useState } from "react";
import { Menu, Compass, Info, Download, Upload, RefreshCcw, ChevronDown } from "lucide-react";
import { secondsToHoursMinutes, metersToMiles } from "@/lib/riversiderally/routing";

interface TopBarProps {
  eventName: string;
  scoutingDate: string;
  totalDistanceMeters: number | null;
  totalDurationSeconds: number | null;
  scoutingMode: boolean;
  onToggleScouting: () => void;
  onOpenPreDrive: () => void;
  onToggleSidebar: () => void;
  onExportGeoJson: () => void;
  onExportGpx: () => void;
  onExportScoutingJson: () => void;
  onImportScoutingJson: (file: File) => void;
  onResetScouting: () => void;
}

export default function TopBar({
  eventName,
  scoutingDate,
  totalDistanceMeters,
  totalDurationSeconds,
  scoutingMode,
  onToggleScouting,
  onOpenPreDrive,
  onToggleSidebar,
  onExportGeoJson,
  onExportGpx,
  onExportScoutingJson,
  onImportScoutingJson,
  onResetScouting,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  return (
    <header className="relative z-[1000] flex items-center justify-between gap-2 border-b border-neutral-800 bg-neutral-950/95 px-3 py-2.5 backdrop-blur">
      <div className="flex min-w-0 items-center gap-2">
        <button onClick={onToggleSidebar} className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-800 md:hidden">
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-bold text-white md:text-lg">{eventName}</h1>
            <span className="hidden rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-400 sm:inline">
              SCOUT EDITION
            </span>
          </div>
          <p className="truncate text-xs text-neutral-500">
            {scoutingDate}
            {totalDistanceMeters != null && ` · ${metersToMiles(totalDistanceMeters).toFixed(1)} mi`}
            {totalDurationSeconds != null && ` · ${secondsToHoursMinutes(totalDurationSeconds)}`}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={onOpenPreDrive}
          className="hidden items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 sm:flex"
        >
          <Info size={14} /> Pre-drive
        </button>
        <button
          onClick={onToggleScouting}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${
            scoutingMode ? "bg-orange-500 text-black" : "bg-amber-600 text-black hover:bg-amber-500"
          }`}
        >
          <Compass size={15} /> {scoutingMode ? "Exit Scouting" : "Start Scouting"}
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-1 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800"
          >
            <ChevronDown size={18} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-10 w-56 rounded-xl border border-neutral-800 bg-neutral-900 p-1.5 shadow-xl"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <MenuButton icon={<Info size={14} />} label="Pre-drive info" onClick={onOpenPreDrive} className="sm:hidden" />
              <MenuButton icon={<Download size={14} />} label="Export GeoJSON" onClick={onExportGeoJson} />
              <MenuButton icon={<Download size={14} />} label="Export GPX" onClick={onExportGpx} />
              <MenuButton icon={<Download size={14} />} label="Download scouting report" onClick={onExportScoutingJson} />
              <MenuButton
                icon={<Upload size={14} />}
                label="Import scouting data"
                onClick={() => importRef.current?.click()}
              />
              <MenuButton
                icon={<RefreshCcw size={14} />}
                label="Reset scouting session"
                onClick={onResetScouting}
                danger
              />
            </div>
          )}
        </div>
        <input
          ref={importRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImportScoutingJson(file);
            e.target.value = "";
          }}
        />
      </div>
    </header>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  danger,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${
        danger ? "text-red-400 hover:bg-red-950/40" : "text-neutral-200 hover:bg-neutral-800"
      } ${className ?? ""}`}
    >
      {icon} {label}
    </button>
  );
}
