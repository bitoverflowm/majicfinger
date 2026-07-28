/** @typedef {{ name: string; type: string; description: string; label?: string }} KalshiLiveHolderTradesColumn */

/** Default total rows to pull across cursor pages (Refine). */
export const KALSHI_LIVE_HOLDER_TRADES_LIMIT_DEFAULT = 100;

/** Max total rows across cursor pages. */
export const KALSHI_LIVE_HOLDER_TRADES_LIMIT_MAX = 5000;

/** Max page_size sent to Kalshi per request. */
export const KALSHI_LIVE_HOLDER_TRADES_PAGE_SIZE_MAX = 200;

/**
 * Columns from GET /v1/social/trades `trades` items.
 */
export const KALSHI_LIVE_HOLDER_TRADES_COLUMNS = [
  { name: "trade_id", type: "string", description: "Trade id" },
  { name: "create_date", type: "string", description: "Trade timestamp (ISO)" },
  { name: "ticker", type: "string", description: "Market ticker" },
  { name: "market_id", type: "string", description: "Market UUID" },
  { name: "price", type: "number", description: "Price in cents" },
  { name: "price_dollars", type: "string", description: "Price in dollars" },
  { name: "count", type: "number", description: "Contract count (integer)" },
  { name: "count_fp", type: "string", description: "Contract count (fixed-point)" },
  { name: "taker_side", type: "string", description: "Taker side (yes / no)" },
  { name: "maker_action", type: "string", description: "Maker action (buy / sell)" },
  { name: "taker_action", type: "string", description: "Taker action (buy / sell)" },
  { name: "maker_nickname", type: "string", description: "Maker nickname when public" },
  { name: "taker_nickname", type: "string", description: "Taker nickname when public" },
  { name: "maker_social_id", type: "string", description: "Maker social id when present" },
  { name: "taker_social_id", type: "string", description: "Taker social id when present" },
];

/** @param {KalshiLiveHolderTradesColumn | string} col */
export function getKalshiLiveHolderTradesColumnLabel(col) {
  const name = typeof col === "string" ? col : col.name;
  const fromCol = typeof col === "object" && col.label ? col.label : null;
  return fromCol || name;
}

/**
 * @param {unknown} raw
 * @returns {number}
 */
export function normalizeKalshiLiveHolderTradesLimit(raw) {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return KALSHI_LIVE_HOLDER_TRADES_LIMIT_DEFAULT;
  return Math.min(KALSHI_LIVE_HOLDER_TRADES_LIMIT_MAX, n);
}

/**
 * @param {unknown} raw
 * @returns {number | null} null when unset / invalid
 */
export function normalizeKalshiLiveHolderTradesMinAmount(raw) {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}
