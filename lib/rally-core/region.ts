import type { LatLng } from "@/lib/riversiderally/types";

// A region bundles everything about "where" that the platform's generic services (map
// rendering, POI discovery defaults, pre-drive resources) need, so adding a route somewhere
// other than Richmond is a new RegionConfig, not a code change in the map or discovery layers.
export interface RegionConfig {
  id: string;
  name: string;
  timezone: string;
  distanceUnit: "mi" | "km";
  mapCenter: LatLng;
  defaultZoom: number;
  weatherUrl: string;
  roadConditionsUrl: string;
  roadConditionsLabel: string;
}

export const RICHMOND_REGION: RegionConfig = {
  id: "richmond-va",
  name: "Richmond, Virginia",
  timezone: "America/New_York",
  distanceUnit: "mi",
  mapCenter: { lat: 37.6, lon: -77.75 },
  defaultZoom: 10,
  weatherUrl: "https://forecast.weather.gov/MapClick.php?lat=37.5407&lon=-77.4360",
  roadConditionsUrl: "https://511virginia.org/",
  roadConditionsLabel: "Virginia 511 traffic & incidents",
};

export const REGIONS: RegionConfig[] = [RICHMOND_REGION];
