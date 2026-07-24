import { parseMarketTickerList } from "@/lib/kalshiLive/marketTickerSearch";

/** @typedef {"combined" | "per_event"} KalshiLiveEventsSheetMode */
/** @typedef {"nested" | "per_market"} KalshiLiveEventsRowMode */

const MAX_EVENT_TICKERS = 100;

export const KALSHI_LIVE_EVENTS_SHEET_MODE_COMBINED = /** @type {KalshiLiveEventsSheetMode} */ (
  "combined"
);
export const KALSHI_LIVE_EVENTS_SHEET_MODE_PER_EVENT = /** @type {KalshiLiveEventsSheetMode} */ (
  "per_event"
);

export const KALSHI_LIVE_EVENTS_ROW_MODE_NESTED = /** @type {KalshiLiveEventsRowMode} */ ("nested");
export const KALSHI_LIVE_EVENTS_ROW_MODE_PER_MARKET = /** @type {KalshiLiveEventsRowMode} */ (
  "per_market"
);

/**
 * @param {unknown} raw
 * @returns {KalshiLiveEventsSheetMode}
 */
export function normalizeKalshiLiveEventsSheetMode(raw) {
  return raw === KALSHI_LIVE_EVENTS_SHEET_MODE_COMBINED
    ? KALSHI_LIVE_EVENTS_SHEET_MODE_COMBINED
    : KALSHI_LIVE_EVENTS_SHEET_MODE_PER_EVENT;
}

/**
 * @param {unknown} raw
 * @returns {KalshiLiveEventsRowMode}
 */
export function normalizeKalshiLiveEventsRowMode(raw) {
  return raw === KALSHI_LIVE_EVENTS_ROW_MODE_PER_MARKET
    ? KALSHI_LIVE_EVENTS_ROW_MODE_PER_MARKET
    : KALSHI_LIVE_EVENTS_ROW_MODE_NESTED;
}

/**
 * @param {string} tickersRaw
 * @returns {string[]}
 */
export function parseKalshiLiveEventsTickersInput(tickersRaw) {
  return parseMarketTickerList(tickersRaw);
}

/**
 * @param {string} tickersRaw
 * @returns {string | null}
 */
export function validateKalshiLiveEventsPull(tickersRaw) {
  const tickers = parseKalshiLiveEventsTickersInput(tickersRaw);
  if (!tickers.length) return "Add at least one event ticker using the search above.";
  if (tickers.length > MAX_EVENT_TICKERS) {
    return `Maximum ${MAX_EVENT_TICKERS} events per pull.`;
  }
  return null;
}

/**
 * @param {string | string[]} tickers
 * @param {{
 *   sheetMode?: KalshiLiveEventsSheetMode;
 *   includeMarkets?: boolean;
 *   rowMode?: KalshiLiveEventsRowMode;
 * }} [opts]
 */
export function summarizeKalshiLiveEventsTickerPullRequest(tickers, opts = {}) {
  const list = Array.isArray(tickers) ? tickers : [tickers].filter(Boolean);
  const sheetMode = normalizeKalshiLiveEventsSheetMode(opts.sheetMode);
  const rowMode = normalizeKalshiLiveEventsRowMode(opts.rowMode);
  const parts =
    list.length === 1
      ? [`GET /events/${list[0]}`]
      : [`GET /events/{event_ticker}`, `tickers=${list.join(",")}`];
  if (opts.includeMarkets) {
    parts.push("with_nested_markets=true");
    parts.push(rowMode === KALSHI_LIVE_EVENTS_ROW_MODE_PER_MARKET ? "rows=per_market" : "rows=nested");
  }
  parts.push(
    sheetMode === KALSHI_LIVE_EVENTS_SHEET_MODE_COMBINED
      ? "sheets=combined"
      : "sheets=per_event",
  );
  return parts.join(" · ");
}
