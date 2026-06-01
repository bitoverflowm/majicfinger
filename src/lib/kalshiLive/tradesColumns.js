/** @typedef {{ name: string; type: string; description: string; label?: string }} KalshiLiveTradeColumn */

export const KALSHI_LIVE_TRADES_COLUMNS = [
  { name: "trade_id", type: "string", description: "Unique identifier for this trade" },
  { name: "ticker", type: "string", description: "Market ticker" },
  { name: "count_fp", type: "number", description: "Contracts bought or sold in this trade" },
  { name: "yes_price_dollars", type: "number", description: "Yes price for this trade (dollars)" },
  { name: "no_price_dollars", type: "number", description: "No price for this trade (dollars)" },
  {
    name: "taker_outcome_side",
    type: "string",
    description: "Outcome side the taker is positioned for (yes | no)",
  },
  {
    name: "taker_book_side",
    type: "string",
    description: "Book side for taker direction (bid | ask)",
  },
  {
    name: "taker_side",
    type: "string",
    description: "Legacy taker side (yes | no) — deprecated by Kalshi",
  },
  { name: "created_time", type: "timestamp", description: "When the trade was executed (ISO 8601)" },
];

/** API-bound compose columns (set via Where, not sheet columns). */
export const KALSHI_LIVE_TRADES_API_FILTER_COLUMNS = new Set(["min_ts", "max_ts"]);

const TRADES_API_WHERE_COLUMN_LIST = ["min_ts", "max_ts"];

export { TRADES_API_WHERE_COLUMN_LIST };

/** @param {KalshiLiveTradeColumn | string} col */
export function getKalshiLiveTradeColumnLabel(col) {
  const name = typeof col === "string" ? col : col.name;
  const fromCol = typeof col === "object" && col.label ? col.label : null;
  return fromCol || name;
}

/**
 * Parse a single market ticker for GET /markets/trades (required).
 *
 * @param {string} raw
 * @returns {string}
 */
export function parseKalshiLiveTradesTickerInput(raw) {
  const parts = String(raw || "")
    .split(/[\s,]+/)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  return parts[0] || "";
}
