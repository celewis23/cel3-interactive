import type { PoiCategory } from "./types";

// Best-effort keyword parsing, not real NLP: it maps recognizable words to categories and an
// optional distance override. Anything it can't confidently parse is left for the explicit
// category chips and distance selector to handle instead of guessing.
const KEYWORD_CATEGORIES: { keywords: string[]; category: PoiCategory }[] = [
  { keywords: ["gas", "fuel", "octane", "petrol"], category: "gas" },
  { keywords: ["ev", "charging", "charger"], category: "ev-charging" },
  { keywords: ["restaurant", "food", "dinner", "lunch", "eat"], category: "food" },
  { keywords: ["coffee", "cafe", "espresso"], category: "coffee" },
  { keywords: ["convenience", "snack", "store"], category: "convenience" },
  { keywords: ["mechanic", "repair"], category: "mechanic" },
  { keywords: ["tire", "tyre"], category: "tire-shop" },
  { keywords: ["tow", "towing"], category: "towing" },
  { keywords: ["parts"], category: "auto-parts" },
  { keywords: ["dealership", "dealer"], category: "dealership-service" },
  { keywords: ["restroom", "bathroom", "toilet"], category: "restroom" },
  { keywords: ["park"], category: "park" },
  { keywords: ["overlook", "viewpoint", "scenic"], category: "scenic-overlook" },
  { keywords: ["parking"], category: "parking" },
  { keywords: ["historic", "landmark"], category: "historic-landmark" },
  { keywords: ["hotel", "motel", "lodging"], category: "hotel" },
];

export interface ParsedTextSearch {
  categories: PoiCategory[];
  maxDistanceMiles: number | null;
  locationHint: string | null;
}

export function parseTextSearch(text: string): ParsedTextSearch {
  const lower = text.toLowerCase();

  const categories = KEYWORD_CATEGORIES.filter((entry) => entry.keywords.some((kw) => lower.includes(kw))).map(
    (entry) => entry.category,
  );

  const distanceMatch = lower.match(/within\s+(\d+)\s*(?:mile|mi)/);
  const maxDistanceMiles = distanceMatch ? parseInt(distanceMatch[1], 10) : null;

  const nearMatch = lower.match(/near\s+(.+)$/);
  const locationHint = nearMatch ? nearMatch[1].replace(/within.*$/, "").trim() : null;

  return { categories: [...new Set(categories)], maxDistanceMiles, locationHint };
}
