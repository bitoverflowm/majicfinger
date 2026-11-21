import { FEATURED_WEATHER_SERIES, NYC_COORDINATES } from "./constants";

/** @typedef {{ lon: number; lat: number; region: string; precision: string }} GeoPoint */

/**
 * Kalshi daily-high / low city codes → coordinates.
 * Codes match series tickers like KXHIGHNY, KXHIGHCHI, KXLOWMIA.
 * @type {Array<[string, string, number, number]>}
 */
const WEATHER_CITIES = [
  ["NY", "New York City", NYC_COORDINATES[0], NYC_COORDINATES[1]],
  ["CHI", "Chicago", -87.6298, 41.8781],
  ["MIA", "Miami", -80.1918, 25.7617],
  ["LA", "Los Angeles", -118.2437, 34.0522],
  ["LAX", "Los Angeles", -118.2437, 34.0522],
  ["AUS", "Austin", -97.7431, 30.2672],
  ["DEN", "Denver", -104.9903, 39.7392],
  ["PHX", "Phoenix", -112.074, 33.4484],
  ["SEA", "Seattle", -122.3321, 47.6062],
  ["ATL", "Atlanta", -84.388, 33.749],
  ["DAL", "Dallas", -96.797, 32.7767],
  ["DFW", "Dallas", -96.797, 32.7767],
  ["HOU", "Houston", -95.3698, 29.7604],
  ["IAH", "Houston", -95.3698, 29.7604],
  ["BOS", "Boston", -71.0589, 42.3601],
  ["PHL", "Philadelphia", -75.1652, 39.9526],
  ["DC", "Washington, D.C.", -77.0369, 38.9072],
  ["DCA", "Washington, D.C.", -77.0369, 38.9072],
  ["LAS", "Las Vegas", -115.1398, 36.1699],
  ["LV", "Las Vegas", -115.1398, 36.1699],
  ["MSP", "Minneapolis", -93.265, 44.9778],
  ["MIN", "Minneapolis", -93.265, 44.9778],
  ["DTW", "Detroit", -83.0458, 42.3314],
  ["DET", "Detroit", -83.0458, 42.3314],
  ["PDX", "Portland", -122.6784, 45.5152],
  ["MKE", "Milwaukee", -87.9065, 43.0389],
  ["OKC", "Oklahoma City", -97.5164, 35.4676],
  ["MSY", "New Orleans", -90.0715, 29.9511],
  ["NOLA", "New Orleans", -90.0715, 29.9511],
  ["TPA", "Tampa", -82.4572, 27.9506],
  ["BNA", "Nashville", -86.7816, 36.1627],
  ["CLT", "Charlotte", -80.8431, 35.2271],
  ["RDU", "Raleigh", -78.6382, 35.7796],
  ["STL", "St. Louis", -90.1994, 38.627],
  ["MCI", "Kansas City", -94.5786, 39.0997],
  ["KC", "Kansas City", -94.5786, 39.0997],
  ["IND", "Indianapolis", -86.1581, 39.7684],
  ["SFO", "San Francisco", -122.4194, 37.7749],
  ["SF", "San Francisco", -122.4194, 37.7749],
  ["SAN", "San Diego", -117.1611, 32.7157],
  ["SD", "San Diego", -117.1611, 32.7157],
  ["SMF", "Sacramento", -121.4944, 38.5816],
  ["SAC", "Sacramento", -121.4944, 38.5816],
  ["SLC", "Salt Lake City", -111.891, 40.7608],
  ["PIT", "Pittsburgh", -79.9959, 40.4406],
  ["CLE", "Cleveland", -81.6944, 41.4993],
  ["BWI", "Baltimore", -76.6122, 39.2904],
  ["BAL", "Baltimore", -76.6122, 39.2904],
  ["MCO", "Orlando", -81.3792, 28.5383],
  ["ORL", "Orlando", -81.3792, 28.5383],
  ["JAX", "Jacksonville", -81.6557, 30.3322],
  ["MEM", "Memphis", -90.049, 35.1495],
  ["CVG", "Cincinnati", -84.512, 39.1031],
  ["CIN", "Cincinnati", -84.512, 39.1031],
  ["RIC", "Richmond", -77.436, 37.5407],
  ["BUF", "Buffalo", -78.8784, 42.8864],
  ["ABQ", "Albuquerque", -106.6504, 35.0844],
  ["TUS", "Tucson", -110.9747, 32.2226],
  ["ELP", "El Paso", -106.485, 31.7619],
];

function point(region, lon, lat, precision = "city") {
  return { lon, lat, region, precision };
}

/** @type {Record<string, GeoPoint>} */
const SERIES_GEO = {
  KXFED: point("Washington, D.C.", -77.0365, 38.8977),
  KXPRES: point("United States", -77.0365, 38.8977, "country"),
  KXGOVSHUT: point("Washington, D.C.", -77.0365, 38.8977),
  KXUKRAINE: point("Kyiv", 30.5234, 50.4501),
  KXIRAN: point("Tehran", 51.389, 35.6892),
  KXGDP: point("United States", -77.0365, 38.8977, "country"),
  KXCPI: point("United States", -77.0365, 38.8977, "country"),
  KXUNEMP: point("United States", -77.0365, 38.8977, "country"),
  KXDJT: point("United States", -77.0365, 38.8977, "country"),
};

for (const [code, region, lon, lat] of WEATHER_CITIES) {
  const geo = point(region, lon, lat, "station");
  SERIES_GEO[`KXHIGH${code}`] = geo;
  SERIES_GEO[`KXLOW${code}`] = geo;
}

SERIES_GEO[FEATURED_WEATHER_SERIES] = point("New York City", NYC_COORDINATES[0], NYC_COORDINATES[1], "station");

/** Series tickers (other than NYC featured) to pull onto the globe. */
export const WEATHER_CITY_SERIES = WEATHER_CITIES
  .map(([code]) => `KXHIGH${code}`)
  .filter((ticker, index, list) => list.indexOf(ticker) === index && ticker !== FEATURED_WEATHER_SERIES)
  .slice(0, 22);

export function isWeatherSeries(seriesTicker) {
  return /^KX(HIGH|LOW|TEMP|SNOW|RAIN)/i.test(String(seriesTicker || ""));
}

/** @type {Array<{ re: RegExp; point: GeoPoint }>} */
const TITLE_GEO = [
  { re: /\bnew york|nyc|manhattan|central park\b/i, point: SERIES_GEO.KXHIGHNY },
  { re: /\bchicago|chi-town\b/i, point: SERIES_GEO.KXHIGHCHI },
  { re: /\bl< angeles|\bL\.A\.\b|\bla\b(?=[\s,])/i, point: SERIES_GEO.KXHIGHLAX },
  { re: /\bmiami\b/i, point: SERIES_GEO.KXHIGHMIA },
  { re: /\baustin\b/i, point: SERIES_GEO.KXHIGHAUS },
  { re: /\bdenver\b/i, point: SERIES_GEO.KXHIGHDEN },
  { re: /\bphoenix\b/i, point: SERIES_GEO.KXHIGHPHX },
  { re: /\bseattle\b/i, point: SERIES_GEO.KXHIGHSEA },
  { re: /\batlanta\b/i, point: SERIES_GEO.KXHIGHATL },
  { re: /\bdallas\b/i, point: SERIES_GEO.KXHIGHDAL },
  { re: /\bhouston\b/i, point: SERIES_GEO.KXHIGHHOU },
  { re: /\bboston\b/i, point: SERIES_GEO.KXHIGHBOS },
  { re: /\bphiladelphia|philly\b/i, point: SERIES_GEO.KXHIGHPHL },
  { re: /\bwashington|white house|capitol|congress|senate|fomc|\bfed\b/i, point: SERIES_GEO.KXFED },
  { re: /\blas vegas\b/i, point: SERIES_GEO.KXHIGHLAS },
  { re: /\bminneapolis|twin cities\b/i, point: SERIES_GEO.KXHIGHMSP },
  { re: /\bdetroit\b/i, point: SERIES_GEO.KXHIGHDTW },
  { re: /\bportland\b/i, point: SERIES_GEO.KXHIGHPDX },
  { re: /\bnew orleans\b/i, point: SERIES_GEO.KXHIGHMSY },
  { re: /\btampa\b/i, point: SERIES_GEO.KXHIGHTPA },
  { re: /\bnashville\b/i, point: SERIES_GEO.KXHIGHBNA },
  { re: /\bcharlotte\b/i, point: SERIES_GEO.KXHIGHCLT },
  { re: /\bsan francisco|\bsf\b/i, point: SERIES_GEO.KXHIGHSFO },
  { re: /\bsan diego\b/i, point: SERIES_GEO.KXHIGHSAN },
  { re: /\bukraine|kyiv|kiev|donbas|crimea\b/i, point: SERIES_GEO.KXUKRAINE },
  { re: /\biran|tehran|hormuz\b/i, point: SERIES_GEO.KXIRAN },
  { re: /\bisrael|gaza|hamas|west bank|netanyahu\b/i, point: point("Tel Aviv", 34.7818, 32.0853) },
  { re: /\btaiwan|taipei\b/i, point: point("Taipei", 121.5654, 25.033) },
  { re: /\bchina|beijing|xi jinping\b/i, point: point("Beijing", 116.4074, 39.9042, "country") },
  { re: /\brussia|moscow|kremlin\b/i, point: point("Moscow", 37.6173, 55.7558) },
  { re: /\bvenezuela|maduro\b/i, point: point("Caracas", -66.9036, 10.4806) },
  { re: /\buk\b|united kingdom|britain|london|keir starmer\b/i, point: point("London", -0.1276, 51.5074) },
  { re: /\bfrance|paris|macron\b/i, point: point("Paris", 2.3522, 48.8566) },
  { re: /\bgermany|berlin|merkel|scholz\b/i, point: point("Berlin", 13.405, 52.52) },
  { re: /\bindia|new delhi|modi\b/i, point: point("New Delhi", 77.209, 28.6139) },
  { re: /\bjapan|tokyo\b/i, point: point("Tokyo", 139.6917, 35.6895) },
  { re: /\bsouth korea|seoul|pyongyang|north korea\b/i, point: point("Seoul", 126.978, 37.5665) },
  { re: /\bmexico|mexico city|sheinbaum\b/i, point: point("Mexico City", -99.1332, 19.4326) },
  { re: /\bcanada|ottawa|toronto|trudeau|carney\b/i, point: point("Ottawa", -75.6972, 45.4215) },
  { re: /\bbrazil|brasilia|lula\b/i, point: point("Brasília", -47.8825, -15.7942) },
  { re: /\baustralia|canberra|sydney|albanese\b/i, point: point("Canberra", 149.13, -35.2809) },
  { re: /\bnigeria|lagos|tinubu\b/i, point: point("Lagos", 3.3792, 6.5244) },
  { re: /\bsouth africa|johannesburg|cape town\b/i, point: point("Johannesburg", 28.0473, -26.2041) },
  { re: /\begypt|cairo\b/i, point: point("Cairo", 31.2357, 30.0444) },
  { re: /\bsaudi|riyadh|mbs\b/i, point: point("Riyadh", 46.6753, 24.7136) },
  { re: /\buae|dubai|abu dhabi\b/i, point: point("Dubai", 55.2708, 25.2048) },
  { re: /\bturkey|türkiye|ankara|istanbul|erdogan\b/i, point: point("Ankara", 32.8597, 39.9334) },
  { re: /\bpakistan|islamabad\b/i, point: point("Islamabad", 73.0479, 33.6844) },
  { re: /\bargentina|buenos aires|milei\b/i, point: point("Buenos Aires", -58.3816, -34.6037) },
  { re: /\bnato\b/i, point: point("Brussels", 4.3517, 50.8503) },
  { re: /\bunited nations|\bun\b/i, point: point("New York City", NYC_COORDINATES[0], NYC_COORDINATES[1]) },
];

function seriesKey(raw) {
  const ticker = String(raw || "").trim().toUpperCase();
  if (!ticker) return "";
  const head = ticker.split("-")[0];
  return head;
}

/**
 * @param {{ seriesTicker?: string; title?: string; tags?: string[] }} input
 * @returns {GeoPoint | null}
 */
export function locateMarket(input) {
  const series = seriesKey(input?.seriesTicker);
  if (series && SERIES_GEO[series]) return SERIES_GEO[series];
  if (series && isWeatherSeries(series)) {
    const code = series.replace(/^KX(HIGH|LOW|TEMP|SNOW|RAIN)/, "");
    if (code && SERIES_GEO[`KXHIGH${code}`]) return SERIES_GEO[`KXHIGH${code}`];
  }
  const hay = `${input?.title || ""} ${(input?.tags || []).join(" ")}`;
  for (const row of TITLE_GEO) {
    if (row.re.test(hay)) return row.point;
  }
  return null;
}

export function featuredWeatherPoint() {
  return SERIES_GEO[FEATURED_WEATHER_SERIES];
}

function jitter(lon, lat, seed) {
  if (!seed) return [lon, lat];
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (Math.imul(h, 31) + seed.charCodeAt(i)) | 0;
  const dLon = ((h % 17) - 8) * 0.035;
  const dLat = ((((h >> 8) % 17) - 8) * 0.025);
  return [lon + dLon, lat + dLat];
}

/**
 * @param {GeoPoint | null | undefined} point
 * @param {string} [seed]
 * @returns {import("geojson").Point | null}
 */
export function pointGeometry(point, seed = "") {
  if (!point || !Number.isFinite(point.lon) || !Number.isFinite(point.lat)) return null;
  const [lon, lat] = jitter(point.lon, point.lat, seed);
  return { type: "Point", coordinates: [lon, lat] };
}
