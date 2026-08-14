/**
 * Polymarket Live — currently open and tradable CLOB markets.
 */

export const POLYMARKET_SAMPLING_MARKETS_ENDPOINT_ID = "getSamplingMarkets";
export const POLYMARKET_SAMPLING_MARKETS_LIMIT_MAX = 10000;

export const POLYMARKET_SAMPLING_MARKETS_COLUMNS = [
  { name: "enable_order_book", type: "boolean", description: "Order book enabled" },
  { name: "active", type: "boolean", description: "Market is active" },
  { name: "closed", type: "boolean", description: "Market is closed" },
  { name: "archived", type: "boolean", description: "Market is archived" },
  { name: "accepting_orders", type: "boolean", description: "Market is accepting orders" },
  { name: "accepting_order_timestamp", type: "string", description: "Started accepting orders" },
  { name: "minimum_order_size", type: "number", description: "Minimum order size" },
  { name: "minimum_tick_size", type: "number", description: "Minimum tick size" },
  { name: "condition_id", type: "string", description: "Condition id" },
  { name: "question_id", type: "string", description: "Question id" },
  { name: "question", type: "string", description: "Market question" },
  { name: "description", type: "string", description: "Market description" },
  { name: "market_slug", type: "string", description: "Market slug" },
  { name: "end_date_iso", type: "string", description: "End date" },
  { name: "game_start_time", type: "string", description: "Game start time" },
  { name: "seconds_delay", type: "integer", description: "Trading delay in seconds" },
  { name: "fpmm", type: "string", description: "FPMM address" },
  { name: "maker_base_fee", type: "integer", description: "Maker base fee" },
  { name: "taker_base_fee", type: "integer", description: "Taker base fee" },
  { name: "notifications_enabled", type: "boolean", description: "Notifications enabled" },
  { name: "neg_risk", type: "boolean", description: "Negative-risk market" },
  { name: "neg_risk_market_id", type: "string", description: "Negative-risk market id" },
  { name: "neg_risk_request_id", type: "string", description: "Negative-risk request id" },
  { name: "icon", type: "string", description: "Icon URL" },
  { name: "image", type: "string", description: "Image URL" },
  { name: "rewards", type: "string", description: "Rewards configuration (JSON)" },
  { name: "is_50_50_outcome", type: "boolean", description: "50/50 outcome market" },
  { name: "tokens", type: "string", description: "Outcome tokens (JSON)" },
  { name: "tags", type: "string", description: "Market tags" },
];

export const POLYMARKET_SAMPLING_MARKETS_DEFAULT_COLUMNS = [
  "condition_id",
  "question",
  "market_slug",
  "active",
  "closed",
  "accepting_orders",
  "minimum_order_size",
  "minimum_tick_size",
  "end_date_iso",
  "tokens",
  "tags",
];

/**
 * @typedef {{ limit: number }} PolymarketSamplingMarketsComposeState
 */

/** @returns {PolymarketSamplingMarketsComposeState} */
export function emptyPolymarketSamplingMarketsComposeState() {
  return { limit: 100 };
}

/**
 * @param {unknown} raw
 * @returns {PolymarketSamplingMarketsComposeState}
 */
export function normalizePolymarketSamplingMarketsComposeState(raw) {
  const o = raw && typeof raw === "object" ? /** @type {Record<string, unknown>} */ (raw) : {};
  const n = Number(o.limit);
  return {
    limit:
      Number.isFinite(n) && n > 0
        ? Math.min(POLYMARKET_SAMPLING_MARKETS_LIMIT_MAX, Math.floor(n))
        : 100,
  };
}

/**
 * @param {unknown} value
 */
function samplingMarketCellValue(value) {
  if (value == null) return "";
  if (Array.isArray(value)) {
    if (value.every((v) => v == null || ["string", "number", "boolean"].includes(typeof v))) {
      return value.map((v) => (v == null ? "" : String(v))).join(", ");
    }
    return JSON.stringify(value);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

/**
 * @param {unknown[]} markets
 * @param {string[]} selectedColumns
 * @returns {Record<string, unknown>[]}
 */
export function flattenSamplingMarketsRows(markets, selectedColumns = []) {
  const selected = Array.isArray(selectedColumns)
    ? selectedColumns.map((c) => String(c || "").trim()).filter(Boolean)
    : [];
  const selectedSet = selected.length ? new Set(selected) : null;
  const list = Array.isArray(markets) ? markets : [];
  /** @type {Record<string, unknown>[]} */
  const rows = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const market = /** @type {Record<string, unknown>} */ (item);
    /** @type {Record<string, unknown>} */
    const row = {};
    const keys = selectedSet ? selected : Object.keys(market);
    for (const key of keys) row[key] = samplingMarketCellValue(market[key]);
    rows.push(row);
  }
  return rows;
}
