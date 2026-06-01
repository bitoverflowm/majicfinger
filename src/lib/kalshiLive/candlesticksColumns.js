/** @typedef {{ name: string; type: string; description: string; label?: string }} KalshiLiveCandlestickColumn */

export const KALSHI_LIVE_CANDLESTICK_PERIOD_OPTIONS = [
  { value: 1, label: "1 minute" },
  { value: 60, label: "1 hour" },
  { value: 1440, label: "1 day" },
];

/** Flattened candlestick fields for Connect / sheet (one row per candle per market). */
export const KALSHI_LIVE_CANDLESTICK_COLUMNS = [
  { name: "market_ticker", type: "string", description: "Market ticker this candle belongs to" },
  { name: "end_period_ts", type: "timestamp", description: "Inclusive end of the candlestick period (Unix seconds)" },
  { name: "volume_fp", type: "string", description: "Contracts traded during the period" },
  { name: "open_interest_fp", type: "string", description: "Open interest at end of period" },
  { name: "price_open_dollars", type: "string", description: "Trade price OHLC — open" },
  { name: "price_high_dollars", type: "string", description: "Trade price OHLC — high" },
  { name: "price_low_dollars", type: "string", description: "Trade price OHLC — low" },
  { name: "price_close_dollars", type: "string", description: "Trade price OHLC — close" },
  { name: "price_mean_dollars", type: "string", description: "Mean trade price during period" },
  { name: "price_previous_dollars", type: "string", description: "Last trade price before period" },
  { name: "yes_bid_open_dollars", type: "string", description: "YES bid OHLC — open" },
  { name: "yes_bid_close_dollars", type: "string", description: "YES bid OHLC — close" },
  { name: "yes_ask_open_dollars", type: "string", description: "YES ask OHLC — open" },
  { name: "yes_ask_close_dollars", type: "string", description: "YES ask OHLC — close" },
];

/** API-bound compose columns (set via Where, not sheet columns). */
export const KALSHI_LIVE_CANDLESTICK_API_FILTER_COLUMNS = new Set([
  "start_ts",
  "end_ts",
  "period_interval",
  "include_latest_before_start",
]);

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
