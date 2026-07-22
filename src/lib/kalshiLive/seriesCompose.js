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
 * Discovery mode: category is required; tag is optional (one max).
 * @param {{ category?: string; tag?: string }} opts
 * @returns {string | null}
 */
export function validateKalshiLiveSeriesDiscoveryPull(opts) {
  const category = String(opts?.category || "").trim();
  if (!category) return "Select a category to discover series.";
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
  else parts.push("include_volume=false");
  if (list.length > 1) {
    parts.push(
      opts.sheetMode === KALSHI_LIVE_SERIES_SHEET_MODE_COMBINED
        ? "sheets=combined"
        : "sheets=per_series",
    );
  }
  return parts.join(" · ");
}

/**
 * @param {{
 *   category?: string;
 *   tag?: string;
 *   includeVolume?: boolean;
 *   includeProductMetadata?: boolean;
 *   minUpdatedTs?: number | null;
 * }} opts
 */
export function summarizeKalshiLiveSeriesDiscoveryRequest(opts = {}) {
  const parts = ["GET /series"];
  if (opts.category) parts.push(`category=${opts.category}`);
  if (opts.tag) parts.push(`tags=${opts.tag}`);
  parts.push(`include_volume=${opts.includeVolume ? "true" : "false"}`);
  parts.push(`include_product_metadata=${opts.includeProductMetadata ? "true" : "false"}`);
  if (opts.minUpdatedTs != null && Number.isFinite(Number(opts.minUpdatedTs))) {
    parts.push(`min_updated_ts=${Math.floor(Number(opts.minUpdatedTs))}`);
  }
  parts.push("sheets=combined");
  return parts.join(" · ");
}
