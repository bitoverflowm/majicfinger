import { FEATURED_WEATHER_SERIES, NYC_COORDINATES } from "./constants";

/** @typedef {{ lon: number; lat: number; region: string; precision: string }} GeoPoint */

/** @type {Record<string, GeoPoint>} */
const SERIES_GEO = {
  KXHIGHNY: { lon: NYC_COORDINATES[0], lat: NYC_COORDINATES[1], region: "New York City", precision: "station" },
  KXFED: { lon: -77.0365, lat: 38.8977, region: "Washington, D.C.", precision: "city" },
  KXPRES: { lon: -77.0365, lat: 38.8977, region: "United States", precision: "country" },
  KXGOVSHUT: { lon: -77.0365, lat: 38.8977, region: "Washington, D.C.", precision: "city" },
  KXUKRAINE: { lon: 30.5234, lat: 50.4501, region: "Kyiv", precision: "city" },
  KXIRAN: { lon: 51.389, lat: 35.6892, region: "Tehran", precision: "city" },
};

/** @type {Array<{ re: RegExp; point: GeoPoint }>} */
const TITLE_GEO = [
  { re: /\bnew york|nyc|manhattan|central park\b/i, point: SERIES_GEO.KXHIGHNY },
  { re: /\bwashington|white house|capitol|congress|senate|fomc|\bfed\b/i, point: SERIES_GEO.KXFED },
  { re: /\bukraine|kyiv|kiev|donbas|crimea\b/i, point: SERIES_GEO.KXUKRAINE },
  { re: /\biran|tehran|hormuz\b/i, point: SERIES_GEO.KXIRAN },
  { re: /\bisrael|gaza|hamas|west bank\b/i, point: { lon: 34.7818, lat: 32.0853, region: "Tel Aviv", precision: "city" } },
  { re: /\btaiwan|taipei\b/i, point: { lon: 121.5654, lat: 25.033, region: "Taipei", precision: "city" } },
  { re: /\bchina|beijing|xi jinping\b/i, point: { lon: 116.4074, lat: 39.9042, region: "Beijing", precision: "country" } },
  { re: /\brussia|moscow|kremlin\b/i, point: { lon: 37.6173, lat: 55.7558, region: "Moscow", precision: "city" } },
  { re: /\bvenezuela|maduro\b/i, point: { lon: -66.9036, lat: 10.4806, region: "Caracas", precision: "city" } },
];

/**
 * @param {{ seriesTicker?: string; title?: string; tags?: string[] }} input
 * @returns {GeoPoint | null}
 */
export function locateMarket(input) {
  const series = String(input?.seriesTicker || "").trim().toUpperCase();
  if (series && SERIES_GEO[series]) return SERIES_GEO[series];
  const hay = `${input?.title || ""} ${(input?.tags || []).join(" ")}`;
  for (const row of TITLE_GEO) {
    if (row.re.test(hay)) return row.point;
  }
  return null;
}

export function featuredWeatherPoint() {
  return SERIES_GEO[FEATURED_WEATHER_SERIES];
}

/**
 * @param {GeoPoint | null | undefined} point
 * @returns {import("geojson").Point | null}
 */
export function pointGeometry(point) {
  if (!point || !Number.isFinite(point.lon) || !Number.isFinite(point.lat)) return null;
  return { type: "Point", coordinates: [point.lon, point.lat] };
}
