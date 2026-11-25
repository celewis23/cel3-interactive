"use client";

import { useEffect, useState } from "react";
import { X, MapPin, Navigation, CheckCircle2, NotebookPen, Camera } from "lucide-react";
import type { Destination } from "@/lib/riversiderally/types";
import { googleMapsDirectionsUrl, googleMapsPlaceUrl } from "@/lib/riversiderally/googleMaps";
import { getPhotosForDestination } from "@/lib/riversiderally/photos";

interface DestinationDrawerProps {
  destination: Destination | null;
  visited: boolean;
  onClose: () => void;
  onMarkVisited: (id: string) => void;
  onAddNote: (id: string) => void;
}

export default function DestinationDrawer({
  destination,
  visited,
  onClose,
  onMarkVisited,
  onAddNote,
}: DestinationDrawerProps) {
  const [photoCount, setPhotoCount] = useState(0);

  useEffect(() => {
    if (!destination) return;
    let cancelled = false;
    getPhotosForDestination(destination.id)
      .then((photos) => {
        if (!cancelled) setPhotoCount(photos.length);
      })
      .catch(() => setPhotoCount(0));
    return () => {
      cancelled = true;
    };
  }, [destination]);

  if (!destination) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1000] max-h-[75vh] overflow-y-auto rounded-t-2xl border-t border-amber-500/20 bg-neutral-900/98 p-4 shadow-2xl backdrop-blur md:absolute md:inset-auto md:right-4 md:top-20 md:bottom-4 md:w-96 md:max-h-none md:rounded-2xl md:border">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-amber-400">
            {destination.category.replace("-", " ")}
          </p>
          <h2 className="text-lg font-semibold text-white">{destination.name}</h2>
          {destination.address && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-neutral-400">
              <MapPin size={14} /> {destination.address}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>

      {!destination.coordinatesVerified && (
        <p className="mt-3 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          This location's exact position has not yet been GPS-verified — confirm it while scouting.
        </p>
      )}

      <p className="mt-3 text-sm text-neutral-300">{destination.description}</p>

      {destination.checklist && destination.checklist.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Scouting checklist</p>
          <ul className="mt-1.5 space-y-1 text-sm text-neutral-300">
            {destination.checklist.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-amber-500">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <dl className="mt-4 space-y-1.5 text-sm">
        <InfoRow label="Road access" value={destination.roadAccessNotes} />
        <InfoRow label="Parking" value={destination.parkingObservations} />
        <InfoRow label="Restrooms" value={destination.restroomAvailability} />
        <InfoRow label="Group capacity" value={destination.groupCapacityEstimate} />
        <InfoRow label="Contact" value={destination.contactInfo} />
        <InfoRow label="Planned stop" value={`${destination.plannedStopMinutes} min`} />
      </dl>

      {photoCount > 0 && (
        <p className="mt-3 flex items-center gap-1 text-xs text-neutral-400">
          <Camera size={13} /> {photoCount} photo{photoCount === 1 ? "" : "s"} saved for this stop
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2">
        <a
          href={googleMapsPlaceUrl(destination)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-lg bg-neutral-800 px-3 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          <MapPin size={15} /> Open in Maps
        </a>
        <a
          href={googleMapsDirectionsUrl(destination)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2.5 text-sm font-medium text-black hover:bg-amber-500"
        >
          <Navigation size={15} /> Navigate Here
        </a>
        <button
          onClick={() => onMarkVisited(destination.id)}
          className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium ${
            visited ? "bg-green-600/20 text-green-400" : "bg-neutral-800 text-white hover:bg-neutral-700"
          }`}
        >
          <CheckCircle2 size={15} /> {visited ? "Visited" : "Mark as Visited"}
        </button>
        <button
          onClick={() => onAddNote(destination.id)}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-neutral-800 px-3 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          <NotebookPen size={15} /> Scouting Note
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  const unverified = value.toLowerCase().includes("not yet verified");
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-neutral-500">{label}</dt>
      <dd className={unverified ? "text-amber-400" : "text-neutral-200"}>{value}</dd>
    </div>
  );
}
