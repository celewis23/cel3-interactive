"use client";

import { useEffect, useState } from "react";
import { X, Navigation, MapPin, Star, CheckCircle2, Plus, Phone, Globe } from "lucide-react";
import type { PoiWithDistance } from "@/lib/places/route-proximity";
import { POI_CATEGORY_LABELS } from "@/lib/places/types";
import { loadRallyStopEvaluations, saveRallyStopEvaluation, type RallyStopEvaluation } from "@/lib/places/favorites";

interface POIDetailSheetProps {
  poi: PoiWithDistance;
  isFavorite: boolean;
  onClose: () => void;
  onToggleFavorite: () => void;
  onAddToRally: (required: boolean) => void;
  alreadyInRally: boolean;
}

const EVAL_FIELDS: { key: keyof RallyStopEvaluation; label: string }[] = [
  { key: "blackOwned", label: "Black-owned business (verified)" },
  { key: "groupDining", label: "Group dining available" },
  { key: "groupParking", label: "Group parking availability" },
  { key: "accessibleEntrance", label: "Accessible entrance" },
  { key: "restrooms", label: "Restrooms" },
  { key: "reservationsRecommended", label: "Reservations recommended" },
  { key: "scenicPhotoPotential", label: "Scenic / photo potential" },
  { key: "personallyScoutedAndApproved", label: "Personally scouted and approved" },
];

export default function POIDetailSheet({ poi, isFavorite, onClose, onToggleFavorite, onAddToRally, alreadyInRally }: POIDetailSheetProps) {
  const [evaluation, setEvaluation] = useState<RallyStopEvaluation>({ poiId: poi.id, updatedAt: "" });

  useEffect(() => {
    const all = loadRallyStopEvaluations();
    setEvaluation(all[poi.id] ?? { poiId: poi.id, updatedAt: "" });
  }, [poi.id]);

  function updateField<K extends keyof RallyStopEvaluation>(key: K, value: RallyStopEvaluation[K]) {
    const next = { ...evaluation, [key]: value };
    setEvaluation(next);
    saveRallyStopEvaluation(next);
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(poi.address ?? `${poi.position.lat},${poi.position.lon}`)}`;
  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(poi.address ?? `${poi.position.lat},${poi.position.lon}`)}&travelmode=driving`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1050] max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-amber-500/20 bg-neutral-900/98 p-4 shadow-2xl backdrop-blur md:absolute md:inset-auto md:right-4 md:top-20 md:bottom-4 md:w-96 md:max-h-none md:rounded-2xl md:border">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-amber-400">{POI_CATEGORY_LABELS[poi.category]}</p>
          <h2 className="text-lg font-semibold text-white">{poi.name}</h2>
          {poi.address && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-neutral-400">
              <MapPin size={14} /> {poi.address}
            </p>
          )}
        </div>
        <button onClick={onClose} className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-800" aria-label="Close">
          <X size={18} />
        </button>
      </div>

      <p className="mt-2 text-xs text-neutral-500">{poi.distanceFromRouteMiles.toFixed(1)} mi from search point</p>

      <dl className="mt-3 space-y-1.5 text-sm">
        {poi.phone && (
          <div className="flex items-center gap-1.5 text-neutral-300">
            <Phone size={13} /> {poi.phone}
          </div>
        )}
        {poi.website && (
          <a href={poi.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-amber-400 hover:underline">
            <Globe size={13} /> Website
          </a>
        )}
        <InfoRow label="Hours (OpenStreetMap data)" value={poi.openingHours} />
      </dl>
      {!poi.openingHours && <p className="mt-1 text-xs text-amber-400">Hours not available from OpenStreetMap — not yet verified.</p>}
      <p className="mt-1 text-[11px] text-neutral-600">
        Open/closed status isn&apos;t shown — OpenStreetMap doesn&apos;t provide reliable live status for most places.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-lg bg-neutral-800 px-3 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          <MapPin size={15} /> View Details
        </a>
        <a
          href={navUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2.5 text-sm font-medium text-black hover:bg-amber-500"
        >
          <Navigation size={15} /> Navigate Here
        </a>
        <button
          onClick={onToggleFavorite}
          className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium ${
            isFavorite ? "bg-amber-500/20 text-amber-400" : "bg-neutral-800 text-white hover:bg-neutral-700"
          }`}
        >
          <Star size={15} /> {isFavorite ? "Favorited" : "Save as Favorite"}
        </button>
        <button
          onClick={() => onAddToRally(false)}
          disabled={alreadyInRally}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-neutral-800 px-3 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
        >
          <Plus size={15} /> {alreadyInRally ? "In Rally" : "Add to Rally"}
        </button>
      </div>

      <div className="mt-5 border-t border-neutral-800 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Rally-stop evaluation (your own notes)</p>
        <p className="mt-1 text-[11px] text-neutral-600">
          These are your personal observations, not inferred from this business&apos;s name, location, or demographics.
        </p>
        <div className="mt-2 space-y-1.5">
          {EVAL_FIELDS.map((f) => (
            <label key={f.key} className="flex items-center gap-2 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={!!evaluation[f.key]}
                onChange={(e) => updateField(f.key, e.target.checked as RallyStopEvaluation[typeof f.key])}
                className="h-4 w-4 rounded border-neutral-700 bg-neutral-800 accent-amber-500"
              />
              {f.label}
              {f.key === "personallyScoutedAndApproved" && evaluation.personallyScoutedAndApproved && (
                <CheckCircle2 size={14} className="text-green-500" />
              )}
            </label>
          ))}
        </div>
        <textarea
          value={evaluation.privateNotes ?? ""}
          onChange={(e) => updateField("privateNotes", e.target.value)}
          rows={3}
          placeholder="Private scouting notes about this stop..."
          className="mt-2 w-full rounded-lg bg-neutral-800 p-2.5 text-sm text-white placeholder:text-neutral-500"
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-neutral-200">{value}</dd>
    </div>
  );
}
