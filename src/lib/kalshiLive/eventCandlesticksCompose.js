import {
  estimateKalshiCandlestickCount,
  KALSHI_CANDLESTICK_MAX_CANDLES,
  maxKalshiCandlestickRangeSec,
  partitionCandlestickApiParams,
} from "@/lib/kalshiLive/candlestickCompose";
import { parseMarketTickerList } from "@/lib/kalshiLive/marketTickerSearch";

/**
 * Heuristic: the series ticker is the leading segment of an event ticker
 * (e.g. KXHIGHNY-25JAN01 → KXHIGHNY). Users can override in the field.
 *
 * @param {string} eventTicker
 */
export function inferSeriesTickerFromEvent(eventTicker) {
  const t = String(eventTicker || "").trim().toUpperCase();
  if (!t) return "";
  const parts = t.split("-");
  return parts[0] || t;
}

/**
 * Derive the parent event ticker from a market ticker
 * (e.g. KXHIGHNY-25JAN01-T77 → KXHIGHNY-25JAN01). Users can override in the field.
 *
 * @param {string} marketTicker
 */
export function deriveEventTickerFromMarket(marketTicker) {
  const t = String(marketTicker || "").trim().toUpperCase();
  if (!t) return "";
  const parts = t.split("-");
  if (parts.length >= 3) return parts.slice(0, -1).join("-");
  return t;
}

/**
 * Single event ticker from the field (event candlesticks only allows one parent).
 * @param {string} raw
 * @returns {string}
 */
export function parseKalshiLiveEventCandlesticksTicker(raw) {
  return parseMarketTickerList(raw)[0] || "";
}

/**
 * @param {string} eventTickerRaw
 * @param {string} seriesTickerRaw
 * @param {import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter[]} whereFilters
 * @returns {string | null}
 */
export function validateKalshiLiveEventCandlesticksPull(eventTickerRaw, seriesTickerRaw, whereFilters) {
  const eventTicker = parseKalshiLiveEventCandlesticksTicker(eventTickerRaw);
  if (!eventTicker) return "Search for an event or enter an event ticker.";

  const seriesTicker =
    parseKalshiLiveEventCandlesticksTicker(seriesTickerRaw) ||
    inferSeriesTickerFromEvent(eventTicker);
  if (!seriesTicker) return "Add the series ticker for this event.";

  const { apiParams } = partitionCandlestickApiParams(whereFilters);
  if (![1, 60, 1440].includes(Number(apiParams.period_interval))) {
    return "period_interval must be 1, 60, or 1440 (minutes).";
  }
  if (!Number.isFinite(Number(apiParams.start_ts)) || !Number.isFinite(Number(apiParams.end_ts))) {
    return "Pick a start and end date for the candlestick range.";
  }
  return null;
}

/**
 * @param {string} eventTicker
 * @param {string} seriesTicker
 * @param {Record<string, string | boolean | number>} apiParams
 * @param {{ marketCount?: number; requeries?: number }} [opts]
 */
export function summarizeKalshiLiveEventCandlesticksRequest(
  eventTicker,
  seriesTicker,
  apiParams,
  opts = {},
) {
  const parts = [`GET /series/${seriesTicker}/events/${eventTicker}/candlesticks`];
  parts.push(`start_ts=${apiParams.start_ts}`);
  parts.push(`end_ts=${apiParams.end_ts}`);
  parts.push(`period_interval=${apiParams.period_interval}`);
  if (typeof opts.marketCount === "number") parts.push(`markets=${opts.marketCount}`);
  if (opts.requeries) parts.push(`requeries=${opts.requeries}`);
  return parts.join(" · ");
}

export { partitionCandlestickApiParams, estimateKalshiCandlestickCount, maxKalshiCandlestickRangeSec, KALSHI_CANDLESTICK_MAX_CANDLES };
