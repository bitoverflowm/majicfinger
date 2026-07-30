import { KALSHI_LIVE_MVE_FILTER_EXCLUDE } from "@/lib/kalshiLive/marketDiscovery";
import { parseMarketTickerList } from "@/lib/kalshiLive/marketTickerSearch";

/**
 * Historical GET /historical/markets supports a small, mutually exclusive filter set:
 * limit, cursor, tickers, event_ticker, series_ticker, mve_filter
 * (general pull only; ticker-scoped pulls omit mve_filter = include).
 * Live-only filters (status, created/close/settled/updated timestamps) are not supported.
 *
 * @typedef {"event" | "series" | "markets" | "general"} KalshiHistoricalV2MarketsDiscoveryScope
 *
 * @typedef {{
 *   tickerScope?: KalshiHistoricalV2MarketsDiscoveryScope;
 *   mveFilter?: import("@/lib/kalshiLive/marketDiscovery").KalshiLiveMveFilter | "" | "include";
 *   eventTicker?: string;
 *   seriesTicker?: string;
 *   tickers?: string;
 * }} KalshiHistoricalV2MarketsDiscoveryParams
 */

/** Safety cap while paginating filtered historical discovery pages. */
export const KALSHI_HISTORICAL_V2_MARKETS_DISCOVERY_MAX_ROWS = 5_000;

/**
 * Unscoped (general) discovery: single probe page — do not paginate the full archive.
 * Matches a basic docs-style pull: `?limit=100&mve_filter=exclude`.
 */
export const KALSHI_HISTORICAL_V2_MARKETS_DISCOVERY_GENERAL_LIMIT = 100;

/**
 * Historical mve_filter: omit param to include MVE markets; send "exclude" to drop them.
 * @param {unknown} raw
 * @returns {boolean}
 */
export function isKalshiHistoricalV2MveExcluded(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s || s === "include" || s === "null") return false;
  return s === KALSHI_LIVE_MVE_FILTER_EXCLUDE;
}

/**
 * @param {unknown} raw
 * @returns {KalshiHistoricalV2MarketsDiscoveryScope}
 */
export function normalizeKalshiHistoricalV2MarketsDiscoveryScope(raw) {
  if (raw === "series" || raw === "markets" || raw === "general") return raw;
  return "event";
}

/**
 * @param {KalshiHistoricalV2MarketsDiscoveryParams | Record<string, unknown>} params
 * @returns {string | null}
 */
export function validateKalshiHistoricalV2MarketsDiscoveryPull(params) {
  const scope = normalizeKalshiHistoricalV2MarketsDiscoveryScope(params?.tickerScope);

  const mveRaw = String(params?.mveFilter ?? "").trim().toLowerCase();
  if (mveRaw === "only") {
    return "Historical markets discovery does not support Multivariate Events = only.";
  }

  if (scope === "general") {
    return null;
  }

  if (scope === "event") {
    const eventTicker = String(params?.eventTicker || "").trim();
    if (!eventTicker) return "Enter an event ticker, or switch to General pull without ticker.";
    if (eventTicker.includes(",") || /\s/.test(eventTicker)) {
      return "Event Ticker accepts only a single ticker.";
    }
    return null;
  }

  if (scope === "series") {
    const seriesTickers = parseMarketTickerList(params?.seriesTicker);
    if (!seriesTickers.length) {
      return "Enter a series ticker, or switch to General pull without ticker.";
    }
    if (seriesTickers.length > 1) {
      return "Series Ticker accepts only a single series ticker.";
    }
    return null;
  }

  // markets
  const marketTickers = parseMarketTickerList(params?.tickers);
  if (!marketTickers.length) {
    return "Enter one or more market tickers, or switch to General pull without ticker.";
  }
  if (marketTickers.length > 100) {
    return "Maximum 100 market tickers in the Tickers filter.";
  }
  return null;
}

/**
 * Build query params for GET /historical/markets (without cursor).
 *
 * @param {KalshiHistoricalV2MarketsDiscoveryParams | Record<string, unknown>} params
 * @param {{ limit?: number }} [opts]
 * @returns {Record<string, string>}
 */
export function buildKalshiHistoricalV2MarketsDiscoveryQueryParams(params, opts = {}) {
  const err = validateKalshiHistoricalV2MarketsDiscoveryPull(params);
  if (err) throw new Error(err);

  const scope = normalizeKalshiHistoricalV2MarketsDiscoveryScope(params?.tickerScope);

  /** @type {Record<string, string>} */
  const out = {};
  // Ticker-scoped pulls include MVEs (omit mve_filter). Only general pull exposes the filter.
  if (scope === "general" && isKalshiHistoricalV2MveExcluded(params?.mveFilter)) {
    out.mve_filter = KALSHI_LIVE_MVE_FILTER_EXCLUDE;
  }

  if (scope === "event") {
    const eventTicker = String(params?.eventTicker || "").trim().toUpperCase();
    if (eventTicker) out.event_ticker = eventTicker;
  } else if (scope === "series") {
    const seriesTickers = parseMarketTickerList(params?.seriesTicker);
    if (seriesTickers[0]) out.series_ticker = seriesTickers[0];
  } else if (scope === "markets") {
    const marketTickers = parseMarketTickerList(params?.tickers);
    if (marketTickers.length) out.tickers = marketTickers.join(",");
  }
  // general → no ticker params

  const defaultLimit =
    scope === "general" ? KALSHI_HISTORICAL_V2_MARKETS_DISCOVERY_GENERAL_LIMIT : 1000;
  const limit = Math.min(
    1000,
    Math.max(1, Math.floor(Number(opts.limit) || defaultLimit)),
  );
  out.limit = String(limit);
  return out;
}

/**
 * @param {KalshiHistoricalV2MarketsDiscoveryParams | Record<string, unknown>} params
 * @param {{ loadedRowCount?: number }} [opts]
 */
export function summarizeKalshiHistoricalV2MarketsDiscoveryRequest(params, opts = {}) {
  const scope = normalizeKalshiHistoricalV2MarketsDiscoveryScope(params?.tickerScope);
  const parts = ["GET /historical/markets", "discovery", `scope=${scope}`, "sheets=combined"];
  try {
    const qs = buildKalshiHistoricalV2MarketsDiscoveryQueryParams(params, {
      limit:
        scope === "general" ? KALSHI_HISTORICAL_V2_MARKETS_DISCOVERY_GENERAL_LIMIT : 1000,
    });
    for (const [k, v] of Object.entries(qs)) {
      parts.push(`${k}=${v}`);
    }
  } catch {
    // Validation failed — still produce a short summary.
  }
  if (opts.loadedRowCount != null) parts.push(`rows=${opts.loadedRowCount}`);
  return parts.join(" · ");
}
