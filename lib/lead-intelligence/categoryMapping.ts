export type OsmTagFilter = {
  key: string;
  value?: string;
};

export type LeadCategoryMapping = {
  label: string;
  aliases: string[];
  tags: OsmTagFilter[];
};

export const LEAD_INTELLIGENCE_CATEGORY_MAPPINGS: LeadCategoryMapping[] = [
  { label: "Dentist", aliases: ["dentist", "dentists", "dental practice", "orthodontist"], tags: [{ key: "amenity", value: "dentist" }, { key: "healthcare", value: "dentist" }] },
  { label: "Restaurant", aliases: ["restaurant", "restaurants", "food", "dining"], tags: [{ key: "amenity", value: "restaurant" }, { key: "amenity", value: "fast_food" }, { key: "amenity", value: "cafe" }] },
  { label: "Chiropractor", aliases: ["chiropractor", "chiropractors", "chiropractic"], tags: [{ key: "healthcare", value: "chiropractor" }] },
  { label: "Gym", aliases: ["gym", "fitness studio", "fitness center", "personal training gym"], tags: [{ key: "leisure", value: "fitness_centre" }, { key: "sport" }] },
  { label: "Yoga studio", aliases: ["yoga studio", "yoga", "pilates studio"], tags: [{ key: "leisure", value: "fitness_centre" }, { key: "sport", value: "yoga" }] },
  { label: "Barber", aliases: ["barber", "barbershop", "barber shop"], tags: [{ key: "shop", value: "hairdresser" }] },
  { label: "Beauty salon", aliases: ["beauty salon", "salon", "spa", "day spa"], tags: [{ key: "shop", value: "beauty" }, { key: "shop", value: "hairdresser" }, { key: "leisure", value: "spa" }] },
  { label: "Auto repair shop", aliases: ["auto repair", "auto repair shop", "mechanic", "car repair"], tags: [{ key: "shop", value: "car_repair" }, { key: "craft", value: "mechanic" }] },
  { label: "Church", aliases: ["church", "churches", "faith-based", "ministry"], tags: [{ key: "amenity", value: "place_of_worship" }, { key: "building", value: "church" }] },
  { label: "Lawyer", aliases: ["lawyer", "law firm", "attorney"], tags: [{ key: "office", value: "lawyer" }] },
  { label: "Accountant", aliases: ["accountant", "accounting", "bookkeeper"], tags: [{ key: "office", value: "accountant" }] },
  { label: "Real estate agency", aliases: ["real estate", "real estate agency", "realtor"], tags: [{ key: "office", value: "estate_agent" }] },
  { label: "Contractor", aliases: ["contractor", "construction", "builder"], tags: [{ key: "craft", value: "builder" }, { key: "office", value: "company" }] },
  { label: "Coffee shop", aliases: ["coffee shop", "coffee", "cafe"], tags: [{ key: "amenity", value: "cafe" }] },
  { label: "Daycare", aliases: ["daycare", "childcare", "child care"], tags: [{ key: "amenity", value: "childcare" }, { key: "amenity", value: "kindergarten" }] },
  { label: "Photographer", aliases: ["photographer", "photography studio"], tags: [{ key: "craft", value: "photographer" }, { key: "shop", value: "photo" }] },
  { label: "Massage therapist", aliases: ["massage", "massage therapist", "massage therapy"], tags: [{ key: "shop", value: "massage" }, { key: "healthcare", value: "massage_therapist" }] },
  { label: "Retail store", aliases: ["retail", "retail store", "shop", "store"], tags: [{ key: "shop" }] },
  { label: "Nonprofit", aliases: ["nonprofit", "non-profit", "charity"], tags: [{ key: "office", value: "association" }, { key: "amenity", value: "community_centre" }] },
  { label: "School", aliases: ["school", "private school", "education"], tags: [{ key: "amenity", value: "school" }] },
];

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function resolveOsmCategoryMappings(categories: string[]): LeadCategoryMapping[] {
  const normalizedCategories = categories.map(normalize).filter(Boolean);
  const matched = LEAD_INTELLIGENCE_CATEGORY_MAPPINGS.filter((mapping) =>
    [mapping.label, ...mapping.aliases].some((alias) => normalizedCategories.includes(normalize(alias)))
  );

  if (matched.length) return matched;

  return normalizedCategories.length
    ? normalizedCategories.map((category) => ({
        label: category,
        aliases: [category],
        tags: [{ key: "name" }],
      }))
    : [LEAD_INTELLIGENCE_CATEGORY_MAPPINGS[1]];
}
