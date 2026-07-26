/**
 * Multivariate events discovery (GET /events/multivariate).
 * Exploration-only — no semantic search for multivariate events themselves.
 * Series ticker supports semantic search; collection ticker is manual entry.
 * series_ticker and collection_ticker are mutually exclusive.
 */

import { parseMarketTickerList } from "@/lib/kalshiLive/marketTickerSearch";
import {
  KALSHI_LIVE_EVENTS_ROW_MODE_NESTED,
  KALSHI_LIVE_EVENTS_ROW_MODE_PER_MARKET,
  normalizeKalshiLiveEventsRowMode,
} from "@/lib/kalshiLive/eventCompose";

/**
 * @typedef {{
 *   seriesTicker?: string;
 *   collectionTicker?: string;
 * }} KalshiLiveMultivariateEventsDiscoveryParams
 */

/** Soft cap matching Markets / Events discovery — keep sheet UI safe. */
export const KALSHI_LIVE_MULTIVARIATE_EVENTS_MAX_ROWS = 20_000;

/**
 * Per-page API `limit` for this endpoint (Refine Query). API allows up to 200;
 * we keep the UI max at 100 for now.
 */
export const KALSHI_LIVE_MULTIVARIATE_EVENTS_PAGE_LIMIT_MAX = 100;
export const KALSHI_LIVE_MULTIVARIATE_EVENTS_PAGE_LIMIT_DEFAULT = 100;

/**
 * @returns {KalshiLiveMultivariateEventsDiscoveryParams}
 */
export function emptyKalshiLiveMultivariateEventsDiscoveryParams() {
  return {
    seriesTicker: "",
    collectionTicker: "",
  };
}

/**
 * @param {unknown} raw
 * @returns {number}
 */
export function clampMultivariateEventsPageLimit(raw) {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return KALSHI_LIVE_MULTIVARIATE_EVENTS_PAGE_LIMIT_DEFAULT;
  return Math.min(KALSHI_LIVE_MULTIVARIATE_EVENTS_PAGE_LIMIT_MAX, n);
}

/**
 * @param {KalshiLiveMultivariateEventsDiscoveryParams} params
 * @returns {string | null}
 */
export function validateKalshiLiveMultivariateEventsDiscoveryPull(params) {
  const seriesTickers = parseMarketTickerList(params.seriesTicker);
  if (seriesTickers.length > 1) {
    return "Series Ticker accepts only a single series ticker.";
  }

  const collection = String(params.collectionTicker || "").trim();
  if (collection && /\s|,/.test(collection)) {
    return "Collection Ticker accepts only a single ticker (no commas or spaces).";
  }

  if (seriesTickers[0] && collection) {
    return "Use either Series Ticker or Collection Ticker — not both.";
  }

  return null;
}

/**
 * @param {KalshiLiveMultivariateEventsDiscoveryParams} params
 * @param {{
 *   limit?: number;
 *   withNestedMarkets?: boolean;
 * }} [opts]
 * @returns {Record<string, string>}
 */
export function buildKalshiLiveMultivariateEventsDiscoveryQueryParams(params, opts = {}) {
  /** @type {Record<string, string>} */
  const out = {};
  out.limit = String(clampMultivariateEventsPageLimit(opts.limit));

  const seriesTickers = parseMarketTickerList(params.seriesTicker);
  const collection = String(params.collectionTicker || "").trim();

  // Mutual exclusion: prefer series when both somehow present (UI should prevent this).
  if (seriesTickers[0]) {
    out.series_ticker = seriesTickers[0];
  } else if (collection) {
    out.collection_ticker = collection;
  }

  if (opts.withNestedMarkets) out.with_nested_markets = "true";

  return out;
}

/**
 * @param {KalshiLiveMultivariateEventsDiscoveryParams} params
 * @param {{
 *   loadedRowCount?: number;
 *   includeMarkets?: boolean;
 *   rowMode?: import("@/lib/kalshiLive/eventCompose").KalshiLiveEventsRowMode;
 *   pageLimit?: number;
 * }} [extra]
 */
export function summarizeKalshiLiveMultivariateEventsDiscoveryRequest(params, extra = {}) {
  const parts = ["GET /events/multivariate"];
  const series = parseMarketTickerList(params.seriesTicker)[0];
  if (series) parts.push(`series_ticker=${series}`);
  const collection = String(params.collectionTicker || "").trim();
  if (collection && !series) parts.push(`collection_ticker=${collection}`);
  if (typeof extra.pageLimit === "number") parts.push(`limit=${extra.pageLimit}`);
  if (extra.includeMarkets) {
    parts.push("with_nested_markets=true");
    const rowMode = normalizeKalshiLiveEventsRowMode(extra.rowMode);
    parts.push(
      rowMode === KALSHI_LIVE_EVENTS_ROW_MODE_PER_MARKET ? "rows=per_market" : "rows=nested",
    );
  } else {
    parts.push(`rows=${KALSHI_LIVE_EVENTS_ROW_MODE_NESTED}`);
  }
  if (typeof extra.loadedRowCount === "number") {
    parts.push(`loaded=${extra.loadedRowCount}`);
  }
  return parts.join(" · ");
}
