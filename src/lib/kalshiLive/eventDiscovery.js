import { parseMarketTickerList } from "@/lib/kalshiLive/marketTickerSearch";
import { KALSHI_LIVE_EVENT_STATUS_OPTIONS } from "@/lib/kalshiLive/eventsColumns";
import {
  KALSHI_LIVE_EVENTS_ROW_MODE_NESTED,
  KALSHI_LIVE_EVENTS_ROW_MODE_PER_MARKET,
  normalizeKalshiLiveEventsRowMode,
} from "@/lib/kalshiLive/eventCompose";

/**
 * @typedef {{
 *   status?: string;
 *   seriesTicker?: string;
 *   tickers?: string;
 *   minCloseTs?: number | "";
 *   minUpdatedTs?: number | "";
 * }} KalshiLiveEventsDiscoveryParams
 */

export const KALSHI_LIVE_EVENTS_DISCOVERY_MAX_ROWS = 20_000;

/**
 * @returns {KalshiLiveEventsDiscoveryParams}
 */
export function emptyKalshiLiveEventsDiscoveryParams() {
  return {
    status: "",
    seriesTicker: "",
    tickers: "",
    minCloseTs: "",
    minUpdatedTs: "",
  };
}

/**
 * @param {KalshiLiveEventsDiscoveryParams} params
 * @returns {string | null}
 */
export function validateKalshiLiveEventsDiscoveryPull(params) {
  const status = String(params.status || "").trim();
  if (status && !KALSHI_LIVE_EVENT_STATUS_OPTIONS.includes(status)) {
    return `Unknown status "${status}".`;
  }

  const seriesTickers = parseMarketTickerList(params.seriesTicker);
  if (seriesTickers.length > 1) {
    return "Series Ticker accepts only a single series ticker.";
  }

  const eventTickers = parseMarketTickerList(params.tickers);
  if (eventTickers.length > 100) {
    return "Maximum 100 event tickers in the Tickers filter.";
  }

  const minClose = toUnix(params.minCloseTs);
  const minUpdated = toUnix(params.minUpdatedTs);
  if (minClose != null && minUpdated != null) {
    // Both allowed together per API — no lock.
  }

  return null;
}

/**
 * @param {unknown} raw
 * @returns {number | null}
 */
function toUnix(raw) {
  if (raw === "" || raw == null) return null;
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * @param {KalshiLiveEventsDiscoveryParams} params
 * @param {{
 *   limit?: number;
 *   withNestedMarkets?: boolean;
 *   withMilestones?: boolean;
 * }} [opts]
 * @returns {Record<string, string>}
 */
export function buildKalshiLiveEventsDiscoveryQueryParams(params, opts = {}) {
  /** @type {Record<string, string>} */
  const out = {};
  const limit = Number(opts.limit);
  out.limit = String(
    Number.isFinite(limit) && limit > 0 ? Math.min(200, Math.floor(limit)) : 200,
  );

  const status = String(params.status || "").trim();
  if (status) out.status = status;

  const seriesTickers = parseMarketTickerList(params.seriesTicker);
  if (seriesTickers[0]) out.series_ticker = seriesTickers[0];

  const eventTickers = parseMarketTickerList(params.tickers);
  if (eventTickers.length) out.tickers = eventTickers.join(",");

  const minClose = toUnix(params.minCloseTs);
  if (minClose != null) out.min_close_ts = String(minClose);

  const minUpdated = toUnix(params.minUpdatedTs);
  if (minUpdated != null) out.min_updated_ts = String(minUpdated);

  if (opts.withNestedMarkets) out.with_nested_markets = "true";
  if (opts.withMilestones) out.with_milestones = "true";

  return out;
}

/**
 * @param {KalshiLiveEventsDiscoveryParams} params
 * @param {{
 *   loadedRowCount?: number;
 *   includeMarkets?: boolean;
 *   rowMode?: import("@/lib/kalshiLive/eventCompose").KalshiLiveEventsRowMode;
 *   withMilestones?: boolean;
 * }} [extra]
 */
export function summarizeKalshiLiveEventsDiscoveryRequest(params, extra = {}) {
  const parts = ["GET /events"];
  const status = String(params.status || "").trim();
  if (status) parts.push(`status=${status}`);
  const series = parseMarketTickerList(params.seriesTicker)[0];
  if (series) parts.push(`series_ticker=${series}`);
  const tickers = parseMarketTickerList(params.tickers);
  if (tickers.length) parts.push(`tickers=${tickers.length}`);
  if (toUnix(params.minCloseTs) != null) parts.push("min_close_ts");
  if (toUnix(params.minUpdatedTs) != null) parts.push("min_updated_ts");
  if (extra.includeMarkets) {
    parts.push("with_nested_markets=true");
    const rowMode = normalizeKalshiLiveEventsRowMode(extra.rowMode);
    parts.push(
      rowMode === KALSHI_LIVE_EVENTS_ROW_MODE_PER_MARKET ? "rows=per_market" : "rows=nested",
    );
  } else {
    parts.push(`rows=${KALSHI_LIVE_EVENTS_ROW_MODE_NESTED}`);
  }
  if (extra.withMilestones) parts.push("with_milestones=true");
  if (typeof extra.loadedRowCount === "number") {
    parts.push(`rows=${extra.loadedRowCount}`);
  }
  return parts.join(" · ");
}
