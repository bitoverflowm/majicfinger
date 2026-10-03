import { isValidMarketTickerToken } from "@/lib/kalshiLive/marketTickerSearch";
import {
  buildKalshiLiveMarketsDiscoveryQueryParams,
  emptyKalshiLiveMarketsDiscoveryParams,
  validateKalshiLiveMarketsDiscoveryPull,
} from "@/lib/kalshiLive/marketDiscovery";
import { normalizeKalshiLiveMarketRow } from "@/lib/kalshiLive/normalizeMarketRow";

/** How many markets a preview scan will read before it stops. */
export const KALSHI_LIVE_MARKET_SCAN_CAP = 20_000;

const DATE_QUERY = {
  created_time: ["minCreatedTs", "maxCreatedTs"],
  updated_time: ["minUpdatedTs", "maxUpdatedTs"],
  close_time: ["minCloseTs", "maxCloseTs"],
  settlement_ts: ["minSettledTs", "maxSettledTs"],
};

export const KALSHI_LIVE_QUERY_ATTRIBUTE_COLUMNS = [
  {
    id: "series_ticker",
    title: "Series ticker",
    type: "text",
    queryOnly: true,
    description: "Sent as series_ticker. One series ticker. Pulls every market in that series.",
  },
  {
    id: "listing_status",
    title: "Listing status",
    type: "text",
    queryOnly: true,
    enumOptions: [
      ["unopened", "Unopened"],
      ["open", "Open"],
      ["paused", "Paused"],
      ["closed", "Closed"],
      ["settled", "Settled"],
    ],
    description: "Sent as status. unopened, open, paused, closed, or settled. One value. This is the request filter, separate from the market's lifecycle Status.",
  },
  {
    id: "tickers",
    title: "Tickers",
    type: "text",
    queryOnly: true,
    description: "Sent as tickers. Comma-separated market tickers, up to 100.",
  },
  {
    id: "mve_filter",
    title: "Multivariate events",
    type: "text",
    queryOnly: true,
    enumOptions: [
      ["exclude", "Exclude"],
      ["only", "Only"],
    ],
    description: "Sent as mve_filter. Exclude leaves combo markets out. Only returns combo markets.",
  },
];

function terms(filter) {
  const seen = new Set();
  const out = [];
  const list = Array.isArray(filter?.containsTags) ? filter.containsTags : [];
  for (const term of [...list, filter?.contains]) {
    const value = String(term || "").trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function oneTicker(filter) {
  const list = terms(filter);
  if (list.length !== 1 || terms({ containsTags: filter?.excludesTags, contains: filter?.excludes }).length) return "";
  return isValidMarketTickerToken(list[0]) ? list[0].toUpperCase() : "";
}

function unixFromIso(iso, edge) {
  const [year, month, day] = String(iso || "").split("-").map(Number);
  if (!year || !month || !day) return "";
  const date = edge === "end" ? new Date(year, month - 1, day, 23, 59, 59) : new Date(year, month - 1, day, 0, 0, 0);
  const sec = Math.floor(date.getTime() / 1000);
  return Number.isFinite(sec) && sec > 0 ? sec : "";
}

/**
 * Turn attribute filters into GET /markets query params.
 * Response-only filters (yes sub title, price, lifecycle status, and the rest) stay off this object.
 * @param {Record<string, any>} filters
 */
export function kalshiLiveDiscoveryFromFilters(filters) {
  const source = filters && typeof filters === "object" ? filters : {};
  const params = emptyKalshiLiveMarketsDiscoveryParams();

  const event = oneTicker(source.event_ticker);
  if (event) params.eventTicker = event;

  const series = oneTicker(source.series_ticker);
  if (series) params.seriesTicker = series;

  const listing = Array.isArray(source.listing_status?.include) ? source.listing_status.include.filter(Boolean) : [];
  if (listing.length === 1) params.status = String(listing[0]);

  const tickerTerms = terms(source.tickers).flatMap((term) => term.split(/[\s,]+/)).map((term) => term.trim()).filter(Boolean);
  const tickerList = [];
  const seen = new Set();
  for (const term of tickerTerms) {
    if (!isValidMarketTickerToken(term)) continue;
    const key = term.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tickerList.push(key);
  }
  if (tickerList.length) params.tickers = tickerList.join(",");

  const mve = Array.isArray(source.mve_filter?.include) ? source.mve_filter.include.filter(Boolean) : [];
  if (mve.length === 1) params.mveFilter = mve[0] === "only" ? "only" : "exclude";
  else if (mve.length > 1) params.mveFilter = "any";

  for (const [columnId, [minKey, maxKey]] of Object.entries(DATE_QUERY)) {
    const filter = source[columnId];
    if (!filter) continue;
    if (filter.from) params[minKey] = unixFromIso(filter.from, "start");
    if (filter.to) params[maxKey] = unixFromIso(filter.to, "end");
  }

  return params;
}

/**
 * True when the discovery object narrows the request past the default (mve exclude, no other params).
 * @param {Record<string, any>} filters
 */
/**
 * @param {Record<string, any>} filters
 * @returns {string}
 */
export function kalshiLiveFilterQueryError(filters) {
  const source = filters && typeof filters === "object" ? filters : {};
  const listing = Array.isArray(source.listing_status?.include) ? source.listing_status.include.filter(Boolean) : [];
  if (listing.length > 1) return "Listing status accepts a single value.";
  const seriesTerms = terms(source.series_ticker);
  if (seriesTerms.length > 1) return "Series ticker accepts a single ticker.";
  const eventTerms = terms(source.event_ticker);
  if (eventTerms.length > 1 && eventTerms.every((term) => isValidMarketTickerToken(term))) {
    return "Event ticker accepts a single ticker.";
  }
  return validateKalshiLiveMarketsDiscoveryPull(kalshiLiveDiscoveryFromFilters(source)) || "";
}

export function kalshiLiveDiscoveryIsNarrow(filters) {
  const params = kalshiLiveDiscoveryFromFilters(filters);
  return Boolean(
    params.status ||
      params.eventTicker ||
      params.seriesTicker ||
      params.tickers ||
      params.minCreatedTs ||
      params.maxCreatedTs ||
      params.minUpdatedTs ||
      params.maxUpdatedTs ||
      params.minCloseTs ||
      params.maxCloseTs ||
      params.minSettledTs ||
      params.maxSettledTs ||
      params.mveFilter === "only" ||
      params.mveFilter === "any",
  );
}

async function getJson(url, signal) {
  const res = await fetch(url, { credentials: "same-origin", signal });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Kalshi markets request failed");
  return json;
}

/**
 * Page GET /markets until the match limit, the scan cap, or the cursor ends.
 * @param {{
 *   discovery: Record<string, any>,
 *   limit: number,
 *   signal?: AbortSignal,
 *   match?: (row: Record<string, unknown>) => boolean,
 *   onPage?: (info: { rows: Record<string, unknown>[], scanned: number, exhausted: boolean }) => void,
 * }} args
 */
export async function scanKalshiLiveMarkets({ discovery, limit, signal, match, onPage }) {
  const err = validateKalshiLiveMarketsDiscoveryPull(discovery);
  if (err) return { rows: [], scanned: 0, exhausted: true, truncated: false, error: err };

  const cap = Math.max(1, Math.min(KALSHI_LIVE_MARKET_SCAN_CAP, Math.floor(Number(limit) || KALSHI_LIVE_MARKET_SCAN_CAP)));
  const matched = [];
  let scanned = 0;
  let cursor = "";
  let exhausted = false;

  for (let page = 0; page < 40 && scanned < KALSHI_LIVE_MARKET_SCAN_CAP && matched.length < cap; page += 1) {
    if (signal?.aborted) {
      const abort = new Error("Aborted");
      abort.name = "AbortError";
      throw abort;
    }
    const params = buildKalshiLiveMarketsDiscoveryQueryParams(discovery, { limit: 1000 });
    const qs = new URLSearchParams({ discovery: "1", ...params });
    if (cursor) qs.set("cursor", cursor);
    const json = await getJson(`/api/integrations/kalshi-live/markets?${qs}`, signal);
    const markets = Array.isArray(json.markets) ? json.markets : [];
    scanned += markets.length;
    for (const raw of markets) {
      const row = normalizeKalshiLiveMarketRow(raw);
      if (!String(row.ticker || "").trim()) continue;
      if (match && !match(row)) continue;
      matched.push(row);
      if (matched.length >= cap) break;
    }
    cursor = String(json.cursor || "").trim();
    if (!cursor || !markets.length) exhausted = true;
    const truncated = !exhausted && matched.length < cap && scanned >= KALSHI_LIVE_MARKET_SCAN_CAP;
    onPage?.({ rows: matched.slice(), scanned, exhausted, truncated });
    if (exhausted) break;
  }
  if (!cursor) exhausted = true;
  const truncated = !exhausted && matched.length < cap;
  return { rows: matched, scanned, exhausted, truncated, error: "" };
}
