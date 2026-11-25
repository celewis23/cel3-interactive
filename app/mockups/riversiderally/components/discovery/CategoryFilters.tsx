"use client";

import type { PoiCategory } from "@/lib/places/types";

const QUICK_CHIPS: { label: string; categories: PoiCategory[] }[] = [
  { label: "All", categories: [] },
  { label: "Gas", categories: ["gas", "ev-charging"] },
  { label: "Food", categories: ["food"] },
  { label: "Coffee", categories: ["coffee"] },
  { label: "Mechanics", categories: ["mechanic", "tire-shop", "towing", "auto-parts", "dealership-service"] },
  { label: "Restrooms", categories: ["restroom"] },
  { label: "Scenic", categories: ["scenic-overlook", "park", "historic-landmark"] },
  { label: "Parking", categories: ["parking"] },
];

const ALL_CATEGORIES: PoiCategory[] = QUICK_CHIPS.flatMap((c) => c.categories);

export default function CategoryFilters({
  active,
  onChange,
}: {
  active: PoiCategory[];
  onChange: (categories: PoiCategory[]) => void;
}) {
  function isActive(chip: (typeof QUICK_CHIPS)[number]) {
    if (chip.categories.length === 0) return active.length === ALL_CATEGORIES.length;
    return chip.categories.every((c) => active.includes(c));
  }

  function toggle(chip: (typeof QUICK_CHIPS)[number]) {
    if (chip.categories.length === 0) {
      onChange(ALL_CATEGORIES);
      return;
    }
    const nowActive = isActive(chip);
    if (nowActive) {
      onChange(active.filter((c) => !chip.categories.includes(c)));
    } else {
      onChange([...new Set([...active, ...chip.categories])]);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {QUICK_CHIPS.map((chip) => (
        <button
          key={chip.label}
          onClick={() => toggle(chip)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium ${
            isActive(chip) ? "bg-amber-500 text-black" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
          }`}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

export { ALL_CATEGORIES };
