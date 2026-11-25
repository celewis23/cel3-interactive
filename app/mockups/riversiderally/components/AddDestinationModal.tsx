"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Destination, StopCategory } from "@/lib/riversiderally/types";

const CATEGORIES: StopCategory[] = ["checkpoint", "scenic-segment", "dining", "optional", "unverified"];

export default function AddDestinationModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (dest: Destination) => void;
}) {
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<StopCategory>("checkpoint");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (!name.trim()) {
      setError("Give this stop a name.");
      return;
    }
    if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
      setError("Latitude and longitude must be numbers — look them up on a map first.");
      return;
    }
    const dest: Destination = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      role: "destination",
      category,
      position: { lat: latNum, lon: lonNum },
      address: address.trim() || undefined,
      description: description.trim() || "No description yet.",
      plannedStopMinutes: 15,
      optional: true,
      coordinatesVerified: false,
    };
    onAdd(dest);
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/60 md:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-neutral-900 p-4 shadow-2xl md:rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Add destination</h3>
          <button onClick={onClose} className="rounded-full p-1 text-neutral-400 hover:bg-neutral-800">
            <X size={18} />
          </button>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          Coordinates aren't verified automatically — look them up (e.g. in Google Maps, long-press a point) before
          relying on them.
        </p>

        <div className="mt-3 space-y-3">
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Latitude">
              <input value={lat} onChange={(e) => setLat(e.target.value)} className={inputCls} placeholder="37.xxxxx" />
            </Field>
            <Field label="Longitude">
              <input value={lon} onChange={(e) => setLon(e.target.value)} className={inputCls} placeholder="-77.xxxxx" />
            </Field>
          </div>
          <Field label="Address (optional)">
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value as StopCategory)} className={inputCls}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace("-", " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
          </Field>
        </div>

        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

        <button
          onClick={handleSubmit}
          className="mt-4 w-full rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-black hover:bg-amber-500"
        >
          Add to itinerary
        </button>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-400">{label}</span>
      {children}
    </label>
  );
}
