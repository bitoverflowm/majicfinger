/** @typedef {{ name: string; type: string; description: string; label?: string }} KalshiLiveMarketColumn */

/**
 * Connect / sheet column picker for Kalshi Live markets (GET /markets and GET /markets/{ticker}).
 * Omits deprecated response fields: title, subtitle, expiration_time, liquidity_dollars.
 */
export const KALSHI_LIVE_MARKETS_COLUMNS = [
  { name: "ticker", type: "string", description: "Unique market ticker" },
  { name: "event_ticker", type: "string", description: "Parent event ticker" },
  { name: "market_type", type: "string", description: "binary | scalar" },
  { name: "yes_sub_title", type: "string", description: 'Shortened title for the "Yes" side' },
  { name: "no_sub_title", type: "string", description: 'Shortened title for the "No" side' },
  { name: "created_time", type: "timestamp", description: "ISO 8601 created time" },
  { name: "updated_time", type: "timestamp", description: "ISO 8601 last non-trading metadata update" },
  { name: "open_time", type: "timestamp", description: "ISO 8601 open time" },
  { name: "close_time", type: "timestamp", description: "ISO 8601 close time" },
  { name: "latest_expiration_time", type: "timestamp", description: "Latest possible expiration (ISO 8601)" },
  {
    name: "settlement_timer_seconds",
    type: "int",
    description: "Seconds after determination until settlement",
  },
  {
    name: "status",
    type: "string",
    description:
      "initialized | inactive | active | closed | determined | disputed | amended | finalized",
  },
  { name: "yes_bid_dollars", type: "string", description: "Best YES bid (dollars)" },
  {
    name: "yes_bid_size_fp",
    type: "number",
    description: "Contract size at best YES bid (fixed-point count)",
  },
  { name: "yes_ask_dollars", type: "string", description: "Best YES ask (dollars)" },
  {
    name: "yes_ask_size_fp",
    type: "number",
    description: "Contract size at best YES ask (fixed-point count)",
  },
  { name: "no_bid_dollars", type: "string", description: "Best NO bid (dollars)" },
  { name: "no_ask_dollars", type: "string", description: "Best NO ask (dollars)" },
  { name: "last_price_dollars", type: "string", description: "Last traded YES price (dollars)" },
  { name: "volume_fp", type: "number", description: "Lifetime volume (contracts)" },
  { name: "volume_24h_fp", type: "number", description: "24h volume (contracts)" },
  { name: "result", type: "string", description: "yes | no | scalar | (empty)" },
  { name: "can_close_early", type: "boolean", description: "Whether the market can close early" },
  { name: "open_interest_fp", type: "number", description: "Open interest (contracts)" },
  {
    name: "notional_value_dollars",
    type: "string",
    description: "Total value of a single contract at settlement (dollars)",
  },
  {
    name: "previous_yes_bid_dollars",
    type: "string",
    description: "Best YES bid one day ago (dollars)",
  },
  {
    name: "previous_yes_ask_dollars",
    type: "string",
    description: "Best YES ask one day ago (dollars)",
  },
  {
    name: "previous_price_dollars",
    type: "string",
    description: "Last YES trade price one day ago (dollars)",
  },
  { name: "expiration_value", type: "string", description: "Value considered for settlement" },
  { name: "rules_primary", type: "string", description: "Primary market rules text" },
  { name: "rules_secondary", type: "string", description: "Secondary market rules text" },
  {
    name: "price_level_structure",
    type: "string",
    description: "Price level structure (ranges and tick sizes)",
  },
  {
    name: "price_ranges",
    type: "string",
    description: "JSON array of valid price ranges for orders",
  },
  {
    name: "expected_expiration_time",
    type: "timestamp",
    description: "Expected expiration (ISO 8601)",
  },
  {
    name: "settlement_value_dollars",
    type: "string",
    description: "YES/LONG settlement value (dollars); filled after determination",
  },
  {
    name: "settlement_ts",
    type: "timestamp",
    description: "Settlement timestamp (ISO 8601); settled markets only",
  },
  {
    name: "occurrence_datetime",
    type: "timestamp",
    description: "When the underlying event occurred (ISO 8601)",
  },
  {
    name: "fee_waiver_expiration_time",
    type: "timestamp",
    description: "When the market fee waiver expires (ISO 8601)",
  },
  {
    name: "early_close_condition",
    type: "string",
    description: "Condition under which the market can close early",
  },
  {
    name: "strike_type",
    type: "string",
    description:
      "greater | greater_or_equal | less | less_or_equal | between | functional | custom | structured",
  },
  {
    name: "floor_strike",
    type: "number",
    description: "Minimum expiration value that leads to a YES settlement",
  },
  {
    name: "cap_strike",
    type: "number",
    description: "Maximum expiration value that leads to a YES settlement",
  },
  {
    name: "functional_strike",
    type: "string",
    description: "Mapping from expiration values to settlement values",
  },
  {
    name: "custom_strike",
    type: "string",
    description: "JSON object: expiration value per target for YES settlement",
  },
  {
    name: "mve_collection_ticker",
    type: "string",
    description: "Multivariate event collection ticker",
  },
  {
    name: "mve_selected_legs",
    type: "string",
    description: "JSON array of selected multivariate event legs",
  },
  { name: "primary_participant_key", type: "string", description: "Primary participant key" },
  {
    name: "is_provisional",
    type: "boolean",
    description: "May be removed after determination if inactive",
  },
  { name: "exchange_index", type: "int", description: "Exchange shard index (currently 0 only)" },
];

/** @param {KalshiLiveMarketColumn | string} col */
export function getKalshiLiveMarketColumnLabel(col) {
  const name = typeof col === "string" ? col : col.name;
  const fromCol = typeof col === "object" && col.label ? col.label : null;
  return fromCol || name;
}

/** Query-filter status values for GET /markets (discovery), not response lifecycle status. */
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
