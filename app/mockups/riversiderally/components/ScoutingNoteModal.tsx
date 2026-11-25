"use client";

import { useRef, useState } from "react";
import { X, Camera } from "lucide-react";
import type { Destination, RatingValue, RecommendChoice, ScoutingFlag, ScoutingNote } from "@/lib/riversiderally/types";
import { fileToPhoto, savePhoto } from "@/lib/riversiderally/photos";

const FLAG_OPTIONS: { value: ScoutingFlag; label: string }[] = [
  { value: "potholes", label: "Potholes" },
  { value: "narrow-road", label: "Narrow road" },
  { value: "blind-curve", label: "Blind curve" },
  { value: "heavy-traffic", label: "Heavy traffic" },
  { value: "poor-visibility", label: "Poor visibility" },
  { value: "difficult-intersection", label: "Difficult intersection" },
  { value: "limited-parking", label: "Limited parking" },
  { value: "restroom-available", label: "Restroom available" },
  { value: "good-photo-location", label: "Good photo location" },
  { value: "suitable-for-group-stop", label: "Suitable for group stop" },
  { value: "needs-further-investigation", label: "Needs further investigation" },
];

function RatingInput({
  label,
  value,
  onChange,
  allowNA,
  naLabel,
}: {
  label: string;
  value: RatingValue | "n/a" | "not-yet-evaluated";
  onChange: (v: RatingValue | "n/a" | "not-yet-evaluated") => void;
  allowNA?: boolean;
  naLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-sm text-neutral-300">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n as RatingValue)}
            className={`h-7 w-7 rounded-md text-xs font-medium ${
              value === n ? "bg-amber-500 text-black" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
            }`}
          >
            {n}
          </button>
        ))}
        {allowNA && (
          <button
            type="button"
            onClick={() => onChange(naLabel === "Not yet evaluated" ? "not-yet-evaluated" : "n/a")}
            className={`rounded-md px-2 py-1 text-[10px] font-medium ${
              value === "n/a" || value === "not-yet-evaluated"
                ? "bg-amber-500 text-black"
                : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
            }`}
          >
            {naLabel ?? "N/A"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ScoutingNoteModal({
  destination,
  onClose,
  onSave,
}: {
  destination: Destination;
  onClose: () => void;
  onSave: (note: ScoutingNote) => void;
}) {
  const [roadQuality, setRoadQuality] = useState<RatingValue>(null);
  const [scenicValue, setScenicValue] = useState<RatingValue>(null);
  const [drivingEnjoyment, setDrivingEnjoyment] = useState<RatingValue>(null);
  const [parking, setParking] = useState<RatingValue | "n/a">(null);
  const [groupSuitability, setGroupSuitability] = useState<RatingValue>(null);
  const [welcomingAtmosphere, setWelcomingAtmosphere] = useState<RatingValue | "not-yet-evaluated">(
    "not-yet-evaluated",
  );
  const [notes, setNotes] = useState("");
  const [flags, setFlags] = useState<ScoutingFlag[]>([]);
  const [recommend, setRecommend] = useState<RecommendChoice>(null);
  const [photoStatus, setPhotoStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleFlag(flag: ScoutingFlag) {
    setFlags((prev) => (prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]));
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      let gps: { lat: number; lon: number } | undefined;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 }),
          );
          gps = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        } catch {
          // Permission denied or unavailable — save without GPS tag.
        }
      }
      const photo = await fileToPhoto(file, destination.id, undefined, gps);
      await savePhoto(photo);
      setPhotoStatus("Photo saved to this device.");
    } catch (err) {
      setPhotoStatus(`Couldn't save photo: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }

  function handleSubmit() {
    const note: ScoutingNote = {
      id: `note-${Date.now()}`,
      destinationId: destination.id,
      recordedAt: new Date().toISOString(),
      roadQuality,
      scenicValue,
      drivingEnjoyment,
      parking,
      groupSuitability,
      welcomingAtmosphere,
      notes,
      flags,
      recommend,
    };
    onSave(note);
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/60 md:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-neutral-900 p-4 shadow-2xl md:rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Scouting note — {destination.name}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-neutral-400 hover:bg-neutral-800">
            <X size={18} />
          </button>
        </div>

        <div className="mt-3 divide-y divide-neutral-800">
          <RatingInput label="Road quality" value={roadQuality} onChange={(v) => setRoadQuality(v as RatingValue)} />
          <RatingInput label="Scenic value" value={scenicValue} onChange={(v) => setScenicValue(v as RatingValue)} />
          <RatingInput
            label="Driving enjoyment"
            value={drivingEnjoyment}
            onChange={(v) => setDrivingEnjoyment(v as RatingValue)}
          />
          <RatingInput label="Parking" value={parking} onChange={(v) => setParking(v as RatingValue | "n/a")} allowNA />
          <RatingInput
            label="Group suitability"
            value={groupSuitability}
            onChange={(v) => setGroupSuitability(v as RatingValue)}
          />
          <RatingInput
            label="Welcoming atmosphere"
            value={welcomingAtmosphere}
            onChange={(v) => setWelcomingAtmosphere(v as RatingValue | "not-yet-evaluated")}
            allowNA
            naLabel="Not yet evaluated"
          />
        </div>

        <div className="mt-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">Flags</p>
          <div className="flex flex-wrap gap-1.5">
            {FLAG_OPTIONS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => toggleFlag(f.value)}
                className={`rounded-full px-2.5 py-1 text-xs ${
                  flags.includes(f.value)
                    ? "bg-amber-500 text-black"
                    : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">Notes</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Free-form observations..."
            className="w-full rounded-lg bg-neutral-800 p-2.5 text-sm text-white placeholder:text-neutral-500"
          />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Would you recommend this stop?</p>
          <div className="flex gap-1.5">
            {(["yes", "maybe", "no"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setRecommend(opt)}
                className={`rounded-md px-2.5 py-1 text-xs capitalize ${
                  recommend === opt ? "bg-amber-500 text-black" : "bg-neutral-800 text-neutral-400"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white hover:bg-neutral-700"
          >
            <Camera size={15} /> Capture / upload photo
          </button>
          {photoStatus && <p className="text-xs text-neutral-400">{photoStatus}</p>}
        </div>
        <p className="mt-1 text-[11px] text-neutral-600">
          Photos are saved to this browser's local storage only. Export your scouting data regularly — clearing site data
          or storage limits can remove them.
        </p>

        <button
          onClick={handleSubmit}
          className="mt-4 w-full rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-black hover:bg-amber-500"
        >
          Save scouting note
        </button>
      </div>
    </div>
  );
}
