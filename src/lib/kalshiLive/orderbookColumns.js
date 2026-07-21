/** @typedef {{ name: string; type: string; description: string; label?: string }} KalshiLiveOrderbookColumn */

/**
 * Flattened GET /markets/{ticker}/orderbook levels (yes/no bids only).
 * Each API level is [dollars_string, fp] — one sheet row per level.
 */
export const KALSHI_LIVE_ORDERBOOK_COLUMNS = [
  { name: "ticker", type: "string", description: "Market ticker" },
  {
    name: "side",
    type: "string",
    description: "Bid side (yes | no). In binary markets a yes bid at X equals a no ask at 1−X.",
  },
  {
    name: "price_dollars",
    type: "number",
    description: "Price level in dollars (e.g. 0.15 = 15¢)",
  },
  {
    name: "quantity_fp",
    type: "number",
    description: "Contract quantity at this level (fixed-point count)",
  },
  {
    name: "level_index",
    type: "number",
    description: "0-based rank within this side (best → worst as returned by Kalshi)",
  },
];

/** Optional API query params exposed via Where (none required for first cut). */
export const KALSHI_LIVE_ORDERBOOK_API_FILTER_COLUMNS = new Set(["depth"]);

const ORDERBOOK_API_WHERE_COLUMN_LIST = ["depth"];

export { ORDERBOOK_API_WHERE_COLUMN_LIST };

/** @param {KalshiLiveOrderbookColumn | string} col */
export function getKalshiLiveOrderbookColumnLabel(col) {
  const name = typeof col === "string" ? col : col.name;
  const fromCol = typeof col === "object" && col.label ? col.label : null;
  return fromCol || name;
}

/**
 * Parse user input into unique market tickers (comma, newline, or whitespace separated).
 * Same shape as trades/candlesticks input; used for multi-market orderbook pulls.
 *
 * @param {string} raw
 * @returns {string[]}
 */
export function parseKalshiLiveOrderbookTickersInput(raw) {
  const parts = String(raw || "")
    .split(/[\s,]+/)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  return [...new Set(parts)];
}

/**
 * Parse a single market ticker for GET /markets/{ticker}/orderbook (API proxy; one per request).
 *
 * @param {string} raw
 * @returns {string}
 */
export function parseKalshiLiveOrderbookTickerInput(raw) {
  return parseKalshiLiveOrderbookTickersInput(raw)[0] || "";
}
