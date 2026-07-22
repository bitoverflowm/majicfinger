import { parseMarketTickerList } from "@/lib/kalshiLive/marketTickerSearch";

/** @typedef {"combined" | "per_series"} KalshiLiveSeriesSheetMode */

const MAX_SERIES_TICKERS = 100;

export const KALSHI_LIVE_SERIES_SHEET_MODE_COMBINED = /** @type {KalshiLiveSeriesSheetMode} */ (
  "combined"
);
export const KALSHI_LIVE_SERIES_SHEET_MODE_PER_SERIES = /** @type {KalshiLiveSeriesSheetMode} */ (
  "per_series"
);

/**
 * @param {unknown} raw
 * @returns {KalshiLiveSeriesSheetMode}
 */
export function normalizeKalshiLiveSeriesSheetMode(raw) {
  return raw === KALSHI_LIVE_SERIES_SHEET_MODE_COMBINED
    ? KALSHI_LIVE_SERIES_SHEET_MODE_COMBINED
    : KALSHI_LIVE_SERIES_SHEET_MODE_PER_SERIES;
}

/**
 * @param {string} tickersRaw
 * @returns {string[]}
 */
export function parseKalshiLiveSeriesTickersInput(tickersRaw) {
  return parseMarketTickerList(tickersRaw);
}

/**
 * @param {string} tickersRaw
 * @returns {string | null}
 */
export function validateKalshiLiveSeriesPull(tickersRaw) {
  const tickers = parseKalshiLiveSeriesTickersInput(tickersRaw);
  if (!tickers.length) return "Add at least one series using the search above.";
  if (tickers.length > MAX_SERIES_TICKERS) {
    return `Maximum ${MAX_SERIES_TICKERS} series per pull.`;
  }
  return null;
}

/**
 * @param {string | string[]} tickers
 * @param {{ includeVolume?: boolean; sheetMode?: KalshiLiveSeriesSheetMode }} [opts]
 */
export function summarizeKalshiLiveSeriesPullRequest(tickers, opts = {}) {
  const list = Array.isArray(tickers)
    ? tickers.map((t) => String(t || "").trim().toUpperCase()).filter(Boolean)
    : parseKalshiLiveSeriesTickersInput(String(tickers || ""));
  const parts =
    list.length === 1
      ? [`GET /series/${list[0]}`]
      : [`GET /series/{series_ticker}`, `series=${list.join(",")}`];
  if (opts.includeVolume) parts.push("include_volume=true");
  if (list.length > 1) {
    parts.push(
      opts.sheetMode === KALSHI_LIVE_SERIES_SHEET_MODE_COMBINED
        ? "sheets=combined"
        : "sheets=per_series",
    );
  }
  return parts.join(" · ");
}
