import { NextRequest, NextResponse } from "next/server";
import { OsmOverpassProvider } from "@/lib/places/osm-overpass-provider";
import { PoiProviderError, type BoundingBox, type PoiCategory } from "@/lib/places/types";
import { cacheKey, getCached, setCached } from "@/lib/places/cache";

const provider = new OsmOverpassProvider();

const VALID_CATEGORIES: PoiCategory[] = [
  "gas",
  "ev-charging",
  "food",
  "coffee",
  "convenience",
  "mechanic",
  "tire-shop",
  "towing",
  "auto-parts",
  "dealership-service",
  "restroom",
  "park",
  "scenic-overlook",
  "parking",
  "historic-landmark",
  "hotel",
];

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const south = parseFloat(params.get("south") ?? "");
  const west = parseFloat(params.get("west") ?? "");
  const north = parseFloat(params.get("north") ?? "");
  const east = parseFloat(params.get("east") ?? "");
  const categoriesParam = params.get("categories") ?? "";

  if ([south, west, north, east].some((n) => Number.isNaN(n))) {
    return NextResponse.json({ error: "south, west, north, east query params are required numbers." }, { status: 400 });
  }

  const bbox: BoundingBox = { south, west, north, east };
  const areaDegrees = (north - south) * (east - west);
  if (areaDegrees > 4 || areaDegrees <= 0) {
    return NextResponse.json({ error: "Bounding box is invalid or too large for a single request." }, { status: 400 });
  }

  const categories = categoriesParam
    .split(",")
    .map((c) => c.trim())
    .filter((c): c is PoiCategory => (VALID_CATEGORIES as string[]).includes(c));

  if (categories.length === 0) {
    return NextResponse.json({ pois: [] });
  }

  const key = cacheKey(bbox, categories);
  const cached = getCached(key);
  if (cached) {
    return NextResponse.json({ pois: cached, cached: true });
  }

  try {
    const pois = await provider.search({ bbox, categories, limit: 300 });
    setCached(key, pois);
    return NextResponse.json({ pois, cached: false });
  } catch (err) {
    const message = err instanceof PoiProviderError ? err.message : "Unexpected error searching for places.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
