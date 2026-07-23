import { parseMarketTickerList } from "@/lib/kalshiLive/marketTickerSearch";

/** @typedef {"combined" | "per_market"} KalshiLiveMarketsSheetMode */

const MAX_MARKET_TICKERS = 100;

export const KALSHI_LIVE_MARKETS_SHEET_MODE_COMBINED = /** @type {KalshiLiveMarketsSheetMode} */ (
  "combined"
);
export const KALSHI_LIVE_MARKETS_SHEET_MODE_PER_MARKET = /** @type {KalshiLiveMarketsSheetMode} */ (
  "per_market"
);

/**
 * @param {unknown} raw
 * @returns {KalshiLiveMarketsSheetMode}
 */
export function normalizeKalshiLiveMarketsSheetMode(raw) {
  return raw === KALSHI_LIVE_MARKETS_SHEET_MODE_COMBINED
    ? KALSHI_LIVE_MARKETS_SHEET_MODE_COMBINED
    : KALSHI_LIVE_MARKETS_SHEET_MODE_PER_MARKET;
}

/**
 * @param {string} tickersRaw
 * @returns {string[]}
 */
export function parseKalshiLiveMarketsTickersInput(tickersRaw) {
  return parseMarketTickerList(tickersRaw);
}

/**
 * @param {string} tickersRaw
 * @returns {string | null}
 */
export function validateKalshiLiveMarketsPull(tickersRaw) {
  const tickers = parseKalshiLiveMarketsTickersInput(tickersRaw);
  if (!tickers.length) return "Add at least one market using the search above.";
  if (tickers.length > MAX_MARKET_TICKERS) {
    return `Maximum ${MAX_MARKET_TICKERS} markets per pull.`;
  }
  return null;
}

/**
 * @param {string | string[]} tickers
 * @param {{ sheetMode?: KalshiLiveMarketsSheetMode }} [opts]
 */
export function summarizeKalshiLiveMarketsTickerPullRequest(tickers, opts = {}) {
  const list = Array.isArray(tickers) ? tickers : [tickers].filter(Boolean);
  const sheetMode = normalizeKalshiLiveMarketsSheetMode(opts.sheetMode);
  const parts =
    list.length === 1
      ? [`GET /markets/${list[0]}`]
      : [`GET /markets/{ticker}`, `tickers=${list.join(",")}`];
  parts.push(
    sheetMode === KALSHI_LIVE_MARKETS_SHEET_MODE_COMBINED
      ? "sheets=combined"
      : "sheets=per_market",
  );
  return parts.join(" · ");
}
