/** @typedef {{ name: string; type: string; description: string; label?: string }} KalshiLiveMarketColumn */

/** Display labels for Connect / sheet column picker (Kalshi Live GET /markets). */
export const KALSHI_LIVE_MARKETS_COLUMNS = [
  { name: "ticker", type: "string", description: "Unique market ticker" },
  { name: "event_ticker", type: "string", description: "Parent event ticker" },
  { name: "title", type: "string", description: "Market title" },
  { name: "subtitle", type: "string", description: "Market subtitle" },
  { name: "yes_sub_title", type: "string", description: 'Label for the "Yes" outcome' },
  { name: "no_sub_title", type: "string", description: 'Label for the "No" outcome' },
  { name: "status", type: "string", description: "unopened | open | paused | closed | settled" },
  { name: "created_time", type: "timestamp", description: "ISO 8601 created time" },
  { name: "updated_time", type: "timestamp", description: "ISO 8601 metadata update time" },
  { name: "open_time", type: "timestamp", description: "ISO 8601 open time" },
  { name: "close_time", type: "timestamp", description: "ISO 8601 close time" },
  { name: "latest_expiration_time", type: "timestamp", description: "Latest expiration (ISO 8601)" },
  { name: "expected_expiration_time", type: "timestamp", description: "Expected expiration (ISO 8601)" },
  { name: "expiration_time", type: "timestamp", description: "Expiration (ISO 8601)" },
  { name: "settlement_ts", type: "timestamp", description: "Settlement timestamp (ISO 8601)" },
  { name: "occurrence_datetime", type: "timestamp", description: "Occurrence datetime (ISO 8601)" },
  { name: "yes_bid_dollars", type: "string", description: "Best yes bid (dollars, fixed-point string)" },
  { name: "yes_ask_dollars", type: "string", description: "Best yes ask (dollars)" },
  { name: "no_bid_dollars", type: "string", description: "Best no bid (dollars)" },
  { name: "no_ask_dollars", type: "string", description: "Best no ask (dollars)" },
  { name: "last_price_dollars", type: "string", description: "Last trade price (dollars)" },
  { name: "volume_fp", type: "number", description: "Lifetime volume (contracts)" },
  { name: "volume_24h_fp", type: "number", description: "24h volume (contracts)" },
  { name: "open_interest_fp", type: "number", description: "Open interest (contracts)" },
  { name: "liquidity_dollars", type: "string", description: "Liquidity (dollars)" },
  { name: "settlement_value_dollars", type: "string", description: "Settlement value (dollars)" },
  { name: "can_close_early", type: "boolean", description: "Whether the market can close early" },
  { name: "fractional_trading_enabled", type: "boolean", description: "Fractional trading enabled" },
  { name: "is_provisional", type: "boolean", description: "Provisional market flag" },
  { name: "exchange_index", type: "int", description: "Exchange index" },
  { name: "mve_collection_ticker", type: "string", description: "Multivariate collection ticker" },
  { name: "rules_primary", type: "string", description: "Primary market rules text" },
  { name: "rules_secondary", type: "string", description: "Secondary rules text" },
];

/** @param {KalshiLiveMarketColumn | string} col */
export function getKalshiLiveMarketColumnLabel(col) {
  const name = typeof col === "string" ? col : col.name;
  const fromCol = typeof col === "object" && col.label ? col.label : null;
  return fromCol || name;
}

export const KALSHI_LIVE_MARKET_STATUS_OPTIONS = [
  "unopened",
  "open",
  "paused",
  "closed",
  "settled",
];

export const KALSHI_LIVE_TIMESTAMP_FILTER_FIELDS = [
  { id: "min_created_ts", label: "Created after", group: "created" },
  { id: "max_created_ts", label: "Created before", group: "created" },
  { id: "min_close_ts", label: "Close after", group: "close" },
  { id: "max_close_ts", label: "Close before", group: "close" },
  { id: "min_settled_ts", label: "Settled after", group: "settled" },
  { id: "max_settled_ts", label: "Settled before", group: "settled" },
  { id: "min_updated_ts", label: "Updated after", group: "updated" },
];
