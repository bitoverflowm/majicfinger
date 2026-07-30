import {
  KALSHI_LIVE_MVE_FILTER_EXCLUDE,
  normalizeKalshiLiveMveFilter,
} from "@/lib/kalshiLive/marketDiscovery";
import { parseMarketTickerList } from "@/lib/kalshiLive/marketTickerSearch";

/**
 * Historical GET /historical/markets supports a small, mutually exclusive filter set:
 * limit, cursor, tickers, event_ticker, series_ticker, mve_filter (=exclude).
 * Live-only filters (status, created/close/settled/updated timestamps) are not supported.
 *
 * @typedef {{
 *   mveFilter?: import("@/lib/kalshiLive/marketDiscovery").KalshiLiveMveFilter | "";
 *   eventTicker?: string;
 *   seriesTicker?: string;
 *   tickers?: string;
 * }} KalshiHistoricalV2MarketsDiscoveryParams
 */

/** Safety cap while paginating historical discovery pages. */
export const KALSHI_HISTORICAL_V2_MARKETS_DISCOVERY_MAX_ROWS = 5_000;

/**
 * @param {KalshiHistoricalV2MarketsDiscoveryParams | Record<string, unknown>} params
 * @returns {string | null}
 */
export function validateKalshiHistoricalV2MarketsDiscoveryPull(params) {
  const eventTicker = String(params?.eventTicker || "").trim();
  if (eventTicker.includes(",") || eventTicker.includes(" ")) {
    return "Event Ticker accepts only a single ticker.";
  }

  const seriesTickers = parseMarketTickerList(params?.seriesTicker);
  if (seriesTickers.length > 1) {
    return "Series Ticker accepts only a single series ticker.";
  }

  const marketTickers = parseMarketTickerList(params?.tickers);
  if (marketTickers.length > 100) {
    return "Maximum 100 market tickers in the Tickers filter.";
  }

  const mve = normalizeKalshiLiveMveFilter(params?.mveFilter);
  if (mve !== KALSHI_LIVE_MVE_FILTER_EXCLUDE) {
    return "Historical markets discovery only supports Multivariate Events = Exclude.";
  }

  const scopes = [
    eventTicker ? "event" : null,
    seriesTickers[0] ? "series" : null,
    marketTickers.length ? "tickers" : null,
  ].filter(Boolean);

  if (scopes.length === 0) {
    return "Add an event ticker, series ticker, or market tickers before discovering historical markets.";
  }
  if (scopes.length > 1) {
    return "Historical markets filters are mutually exclusive — use only one of Event Ticker, Series Ticker, or Tickers.";
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

  /** @type {Record<string, string>} */
  const out = {
    mve_filter: KALSHI_LIVE_MVE_FILTER_EXCLUDE,
  };

  const eventTicker = String(params?.eventTicker || "").trim().toUpperCase();
  if (eventTicker) out.event_ticker = eventTicker;

  const seriesTickers = parseMarketTickerList(params?.seriesTicker);
  if (seriesTickers[0]) out.series_ticker = seriesTickers[0];

  const marketTickers = parseMarketTickerList(params?.tickers);
  if (marketTickers.length) out.tickers = marketTickers.join(",");

  const limit = Math.min(1000, Math.max(1, Math.floor(Number(opts.limit) || 1000)));
  out.limit = String(limit);
  return out;
}

/**
 * @param {KalshiHistoricalV2MarketsDiscoveryParams | Record<string, unknown>} params
 * @param {{ loadedRowCount?: number }} [opts]
 */
export function summarizeKalshiHistoricalV2MarketsDiscoveryRequest(params, opts = {}) {
  const parts = ["GET /historical/markets", "discovery", "sheets=combined"];
  try {
    const qs = buildKalshiHistoricalV2MarketsDiscoveryQueryParams(params, { limit: 1000 });
    for (const [k, v] of Object.entries(qs)) {
      if (k === "limit") continue;
      parts.push(`${k}=${v}`);
    }
  } catch {
    // Validation failed — still produce a short summary.
  }
  if (opts.loadedRowCount != null) parts.push(`rows=${opts.loadedRowCount}`);
  return parts.join(" · ");
}
