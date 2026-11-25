"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { parseTextSearch } from "@/lib/places/text-search";
import type { PoiCategory } from "@/lib/places/types";

const EXAMPLES = ["93 octane near Route 711", "Coffee near Tucker Park", "Mechanic along my route", "Restaurants within 5 miles"];

export default function POISearch({
  onParsed,
}: {
  onParsed: (result: { categories: PoiCategory[]; maxDistanceMiles: number | null; locationHint: string | null }) => void;
}) {
  const [text, setText] = useState("");

  function handleSubmit() {
    if (!text.trim()) return;
    onParsed(parseTextSearch(text));
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Coffee near Tucker Park..."
          className="flex-1 rounded-lg bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-500"
        />
        <button onClick={handleSubmit} className="rounded-lg bg-neutral-800 px-3 py-2 text-neutral-300 hover:bg-neutral-700">
          <Search size={16} />
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-neutral-600">
        Best-effort keyword search — it maps words like &quot;coffee&quot; or &quot;within 5 miles&quot; to filters below;
        it doesn&apos;t understand full sentences. Try: {EXAMPLES[0]}
      </p>
    </div>
  );
}
