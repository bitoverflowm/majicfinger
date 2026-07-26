/** @typedef {{ name: string; type: string; description: string; label?: string }} KalshiLiveEventColumn */

/**
 * Connect / sheet columns for Kalshi Live events (GET /events and GET /events/{ticker}).
 * Omits deprecated `category`. Nested `markets` / `milestones` are JSON string cells.
 */
export const KALSHI_LIVE_EVENTS_COLUMNS = [
  { name: "event_ticker", type: "string", description: "Unique event ticker" },
  { name: "series_ticker", type: "string", description: "Parent series ticker" },
  { name: "sub_title", type: "string", description: "Shortened event title" },
  { name: "title", type: "string", description: "Full event title" },
  {
    name: "collateral_return_type",
    type: "string",
    description: "How collateral is returned when markets settle",
  },
  {
    name: "mutually_exclusive",
    type: "boolean",
    description: "If true, only one market in this event can resolve to yes",
  },
  {
    name: "available_on_brokers",
    type: "boolean",
    description: "Whether this event is available to trade on brokers",
  },
  {
    name: "settlement_sources",
    type: "string",
    description: "JSON array of official settlement sources",
  },
  {
    name: "strike_date",
    type: "timestamp",
    description: "Date strike (ISO 8601); mutually exclusive with strike_period",
  },
  {
    name: "strike_period",
    type: "string",
    description: "Period strike (e.g. week, month); mutually exclusive with strike_date",
  },
  {
    name: "markets",
    type: "string",
    description: "JSON array of markets (when include markets / nested row mode)",
  },
  {
    name: "product_metadata",
    type: "string",
    description: "JSON object of additional event metadata",
  },
  {
    name: "last_updated_ts",
    type: "timestamp",
    description: "When event metadata was last updated (ISO 8601)",
  },
  {
    name: "fee_type_override",
    type: "string",
    description: "Fee type override for this event (overrides series)",
  },
  {
    name: "fee_multiplier_override",
    type: "number",
    description: "Fee multiplier override for this event",
  },
  { name: "exchange_index", type: "int", description: "Exchange shard index (currently 0 only)" },
  {
    name: "milestones",
    type: "string",
    description: "JSON array of related milestones (requested when this column is selected)",
  },
];

/** @param {KalshiLiveEventColumn | string} col */
export function getKalshiLiveEventColumnLabel(col) {
  const name = typeof col === "string" ? col : col.name;
  const fromCol = typeof col === "object" && col.label ? col.label : null;
  return fromCol || name;
}

/**
 * GET /events/multivariate response columns (EventData). Same shape as Events,
 * but no milestones (that query param is not offered on this endpoint).
 */
export const KALSHI_LIVE_MULTIVARIATE_EVENTS_COLUMNS = KALSHI_LIVE_EVENTS_COLUMNS.filter(
  (c) => c.name !== "milestones",
);

/** @param {KalshiLiveEventColumn | string} col */
export function getKalshiLiveMultivariateEventColumnLabel(col) {
  return getKalshiLiveEventColumnLabel(col);
}

/** Discovery status filter for GET /events. */
export const KALSHI_LIVE_EVENT_STATUS_OPTIONS = ["unopened", "open", "closed", "settled"];

/** True when selected columns require with_milestones on Get Events. */
export function kalshiLiveEventsWantsMilestones(selectedColumns) {
  return Array.isArray(selectedColumns) && selectedColumns.includes("milestones");
}
