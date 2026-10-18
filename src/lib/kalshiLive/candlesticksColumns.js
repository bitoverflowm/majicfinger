/** @typedef {{ name: string; type: KalshiLiveCandlestickFieldType; description: string; label?: string }} KalshiLiveCandlestickColumn */

/** @typedef {'string' | 'number' | 'nullable_number' | 'timestamp'} KalshiLiveCandlestickFieldType */

export const KALSHI_LIVE_CANDLESTICK_PERIOD_OPTIONS = [
  { value: 1, label: "1 minute" },
  { value: 60, label: "1 hour" },
  { value: 1440, label: "1 day" },
];

/** Flattened candlestick fields for Connect / sheet (one row per candle per market). */
export const KALSHI_LIVE_CANDLESTICK_COLUMNS = [
  { name: "market_ticker", type: "string", description: "Market ticker this candle belongs to" },
  {
    name: "end_period_ts",
    type: "timestamp",
    description: "Inclusive end of the candlestick period (Unix seconds)",
  },
  {
    name: "volume_fp",
    type: "number",
    description: "Contracts traded during the period",
  },
  {
    name: "open_interest_fp",
    type: "number",
    description: "Open interest at end of period (contracts)",
  },
  {
    name: "price_open_dollars",
    type: "nullable_number",
    description: "Trade price OHLC — open (null if no trade in period)",
  },
  {
    name: "price_high_dollars",
    type: "nullable_number",
    description: "Trade price OHLC — high (null if no trade in period)",
  },
  {
    name: "price_low_dollars",
    type: "nullable_number",
    description: "Trade price OHLC — low (null if no trade in period)",
  },
  {
    name: "price_close_dollars",
    type: "nullable_number",
    description: "Trade price OHLC — close (null if no trade in period)",
  },
  {
    name: "price_mean_dollars",
    type: "nullable_number",
    description: "Mean trade price during period (null if no trade in period)",
  },
  {
    name: "price_previous_dollars",
    type: "nullable_number",
    description: "Last trade price before period (null if none)",
  },
  {
    name: "price_min_dollars",
    type: "nullable_number",
    description: "Minimum close price during period (null if no trade)",
  },
  {
    name: "price_max_dollars",
    type: "nullable_number",
    description: "Maximum close price during period (null if no trade)",
  },
  { name: "yes_bid_open_dollars", type: "number", description: "YES bid OHLC — open" },
  { name: "yes_bid_high_dollars", type: "number", description: "YES bid OHLC — high" },
  { name: "yes_bid_low_dollars", type: "number", description: "YES bid OHLC — low" },
  { name: "yes_bid_close_dollars", type: "number", description: "YES bid OHLC — close" },
  { name: "yes_ask_open_dollars", type: "number", description: "YES ask OHLC — open" },
  { name: "yes_ask_high_dollars", type: "number", description: "YES ask OHLC — high" },
  { name: "yes_ask_low_dollars", type: "number", description: "YES ask OHLC — low" },
  { name: "yes_ask_close_dollars", type: "number", description: "YES ask OHLC — close" },
];

/** @type {Map<string, KalshiLiveCandlestickFieldType>} */
const CANDLESTICK_FIELD_TYPE_BY_NAME = new Map(
  KALSHI_LIVE_CANDLESTICK_COLUMNS.map((c) => [c.name, c.type]),
);

/** API-bound compose columns (set via Where, not sheet columns). */
export const KALSHI_LIVE_CANDLESTICK_API_FILTER_COLUMNS = new Set([
  "start_ts",
  "end_ts",
  "period_interval",
  "include_latest_before_start",
]);

/** @param {string} columnName */
export function getKalshiLiveCandlestickFieldType(columnName) {
  return CANDLESTICK_FIELD_TYPE_BY_NAME.get(columnName) || "string";
}

/** @param {KalshiLiveCandlestickColumn | string} col */
export function getKalshiLiveCandlestickColumnLabel(col) {
  const name = typeof col === "string" ? col : col.name;
  const fromCol = typeof col === "object" && col.label ? col.label : null;
  return fromCol || name;
}

/**
 * Parse user input into unique market tickers (comma, newline, or whitespace separated).
 *
 * @param {string} raw
 * @returns {string[]}
 */
export function parseKalshiLiveMarketTickersInput(raw) {
  const parts = String(raw || "")
    .split(/[\s,]+/)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  return [...new Set(parts)];
}
